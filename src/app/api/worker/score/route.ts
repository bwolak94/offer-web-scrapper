import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { z } from 'zod'
import { inArray, getTableColumns } from 'drizzle-orm'
import { db } from '@/db'
import { listings, jobs } from '@/db/schema'
import { updateListingScore } from '@/db/queries/listings'
import { updateJobScore }     from '@/db/queries/jobs'
import { scoreItem }          from '@/ai/scorer'
import { checkAfterScoring }  from '@/pipeline/watch-evaluator'
import type { ScoringContext } from '@/types'

export const maxDuration = 300

// ---------------------------------------------------------------------------
// Defaults — used when no criteriaOverride is supplied in the payload
// ---------------------------------------------------------------------------

const DEFAULT_LISTING_CRITERIA =
  'Mieszkanie w dobrej lokalizacji, dobry stosunek ceny do powierzchni, czyste ogłoszenie bez podejrzanych cech.'

const DEFAULT_JOB_CRITERIA =
  'Oferta pracy zgodna z profilem, uczciwe wynagrodzenie, konkretny opis obowiązków.'

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const WorkerScorePayloadSchema = z.object({
  ids:              z.array(z.string().uuid()).min(1).max(50),
  type:             z.enum(['listing', 'job']),
  criteriaOverride: z.string().min(1).max(500).optional(), // aligns with scorer.ts 500-char slice
})

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

type ListingRow = Omit<typeof listings.$inferSelect, 'embedding'>
type JobRow     = Omit<typeof jobs.$inferSelect,     'embedding'>

async function loadRecords(
  ids:  string[],
  type: 'listing' | 'job'
): Promise<ListingRow[] | JobRow[]> {
  if (type === 'listing') {
    const { embedding: _emb, ...cols } = getTableColumns(listings)
    return db.select(cols).from(listings).where(inArray(listings.id, ids)) as Promise<ListingRow[]>
  } else {
    const { embedding: _emb, ...cols } = getTableColumns(jobs)
    return db.select(cols).from(jobs).where(inArray(jobs.id, ids)) as Promise<JobRow[]>
  }
}

function rowToScoringContext(
  row:  ListingRow | JobRow,
  type: 'listing' | 'job'
): ScoringContext {
  if (type === 'listing') {
    const r      = row as ListingRow
    const price  = r.price   != null ? parseFloat(r.price)   : null
    const areaM2 = r.area_m2 != null ? parseFloat(r.area_m2) : null
    return {
      id:          r.id,
      type:        'listing',
      title:       r.title,
      price,
      pricePerM2:  price != null && areaM2 != null && areaM2 > 0 ? Math.round(price / areaM2) : null,
      areaM2,
      rooms:       r.rooms,
      location:    r.location,
      currency:    r.currency ?? 'PLN',
      description: r.description,
    }
  } else {
    const r = row as JobRow
    return {
      id:             r.id,
      type:           'job',
      title:          r.title,
      location:       r.location,
      salaryMin:      r.salary_min != null ? parseFloat(r.salary_min) : null,
      salaryMax:      r.salary_max != null ? parseFloat(r.salary_max) : null,
      currency:       r.currency   ?? 'PLN',
      techStack:      r.tech_stack ?? [],
      remote:         r.remote,
      employmentType: r.employment_type,
      description:    r.description,
    }
  }
}

// ---------------------------------------------------------------------------
// Scoring loop — concurrency-capped, rate-limit-aware
// ---------------------------------------------------------------------------

const CONCURRENCY    = 10
const BATCH_DELAY_MS = 100

async function scoreRecords(
  records:  (ListingRow | JobRow)[],
  type:     'listing' | 'job',
  criteria: string
): Promise<{ scored: number; failed: number; skipped: number }> {
  let scored  = 0
  let failed  = 0
  let skipped = 0

  for (let i = 0; i < records.length; i += CONCURRENCY) {
    const batch = records.slice(i, i + CONCURRENCY)

    await Promise.allSettled(
      batch.map(async (row) => {
        // Skip already-scored items (idempotency on QStash retries)
        if (row.score_status === 'scored') {
          skipped++
          return
        }

        const id  = row.id
        const ctx = rowToScoringContext(row, type)

        try {
          const result = await scoreItem(ctx, criteria)

          if (type === 'listing') {
            await updateListingScore(id, result.score, 'scored')
          } else {
            await updateJobScore(id, result.score, 'scored')
          }

          scored++

          // Fire-and-forget — watch eval errors must NOT fail the scoring result
          checkAfterScoring(id, type, result.score).catch((err) => {
            console.error('[score-worker] watch eval error', { id, type, err })
          })
        } catch (err) {
          // Log and count — do NOT re-throw inside Promise.allSettled.
          // failed > 0 after all batches → handler returns 500 → QStash retries.
          // On retry, already-scored items are skipped (idempotency check above).
          console.error('[score-worker] scoring error', { id, type, err })
          failed++

          // Mark as failed in DB so it doesn't sit as 'pending' forever
          const updateFn = type === 'listing' ? updateListingScore : updateJobScore
          await updateFn(id, 0, 'failed').catch(() => {/* best-effort */ })
        }
      })
    )

    // Respect Groq rate limits between concurrency batches
    if (i + CONCURRENCY < records.length) {
      await new Promise<void>((r) => setTimeout(r, BATCH_DELAY_MS))
    }
  }

  return { scored, failed, skipped }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

async function handler(request: Request): Promise<Response> {
  const rawBody = await request.text()
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const parsed = WorkerScorePayloadSchema.safeParse(payload)
  if (!parsed.success) {
    // 400 → QStash dead-letters this message (bad payload, no infinite retry)
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const { ids, type, criteriaOverride } = parsed.data
  const criteria = criteriaOverride ?? (type === 'listing' ? DEFAULT_LISTING_CRITERIA : DEFAULT_JOB_CRITERIA)

  const records = await loadRecords(ids, type)

  if (records.length === 0) {
    return Response.json({ type, scored: 0, skipped: 0, failed: 0, total: 0 })
  }

  // Fast path: all already scored
  const unscored = records.filter((r) => r.score_status !== 'scored')
  if (unscored.length === 0) {
    return Response.json({ type, scored: 0, skipped: records.length, failed: 0, total: records.length })
  }

  const { scored, failed, skipped } = await scoreRecords(unscored, type, criteria)

  if (failed > 0) {
    // Partial failure → 500 so QStash retries; already-scored items are skipped on retry
    return Response.json(
      { type, scored, failed, skipped, total: records.length },
      { status: 500 }
    )
  }

  return Response.json({ type, scored, failed: 0, skipped, total: records.length })
}

export const POST = verifySignatureAppRouter(handler)
