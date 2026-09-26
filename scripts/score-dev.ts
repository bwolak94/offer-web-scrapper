/**
 * Dev scorer — scores pending listings/jobs locally without QStash.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/score-dev.ts [type] [--limit N] [--criteria "..."]
 *
 * Examples:
 *   npx tsx --env-file=.env.local scripts/score-dev.ts listing
 *   npx tsx --env-file=.env.local scripts/score-dev.ts job
 *   npx tsx --env-file=.env.local scripts/score-dev.ts listing --limit 20
 *   npx tsx --env-file=.env.local scripts/score-dev.ts listing --criteria "Kawalerka w centrum Warszawy, do 500k PLN"
 *
 * Defaults:
 *   type    = listing
 *   limit   = 50
 *   criteria = default Polish criteria (same as worker/score)
 */

import { eq, getTableColumns } from 'drizzle-orm'
import { db } from '@/db'
import { listings, jobs } from '@/db/schema'
import { scoreItem } from '@/ai/scorer'
import { updateListingScore } from '@/db/queries/listings'
import { updateJobScore } from '@/db/queries/jobs'
import type { ScoringContext } from '@/types'

const DEFAULT_LISTING_CRITERIA =
  'Mieszkanie w dobrej lokalizacji, dobry stosunek ceny do powierzchni, czyste ogłoszenie bez podejrzanych cech.'
const DEFAULT_JOB_CRITERIA =
  'Oferta pracy zgodna z profilem, uczciwe wynagrodzenie, konkretny opis obowiązków.'

// ─── Parse CLI args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const type = (args[0] === 'job' ? 'job' : 'listing') as 'listing' | 'job'

const limitIdx = args.indexOf('--limit')
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1] ?? '50', 10) : 50

const criteriaIdx = args.indexOf('--criteria')
const criteria = criteriaIdx !== -1
  ? (args[criteriaIdx + 1] ?? '')
  : (type === 'listing' ? DEFAULT_LISTING_CRITERIA : DEFAULT_JOB_CRITERIA)

// ─── Load pending records ─────────────────────────────────────────────────────

async function loadPending() {
  if (type === 'listing') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { embedding: _emb, ...cols } = getTableColumns(listings)
    return db.select(cols).from(listings).where(eq(listings.score_status, 'pending')).limit(limit)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { embedding: _emb, ...cols } = getTableColumns(jobs)
    return db.select(cols).from(jobs).where(eq(jobs.score_status, 'pending')).limit(limit)
  }
}

function toScoringContext(row: Record<string, unknown>): ScoringContext {
  if (type === 'listing') {
    const price  = row.price  != null ? parseFloat(row.price as string)  : null
    const areaM2 = row.area_m2 != null ? parseFloat(row.area_m2 as string) : null
    return {
      id:          row.id as string,
      type:        'listing',
      title:       row.title as string,
      price,
      pricePerM2:  price != null && areaM2 != null && areaM2 > 0 ? Math.round(price / areaM2) : null,
      areaM2,
      rooms:       row.rooms as number | null,
      location:    row.location as string | null,
      currency:    (row.currency as string | null) ?? 'PLN',
      description: row.description as string | null,
    }
  } else {
    return {
      id:             row.id as string,
      type:           'job',
      title:          row.title as string,
      location:       row.location as string | null,
      salaryMin:      row.salary_min != null ? parseFloat(row.salary_min as string) : null,
      salaryMax:      row.salary_max != null ? parseFloat(row.salary_max as string) : null,
      currency:       (row.currency as string | null) ?? 'PLN',
      techStack:      (row.tech_stack as string[] | null) ?? [],
      remote:         row.remote as boolean | null,
      employmentType: row.employment_type as string | null | undefined,
      description:    row.description as string | null,
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const records = await loadPending()

  if (records.length === 0) {
    console.log(`No pending ${type}s to score.`)
    return
  }

  console.log(`\nScoring ${records.length} pending ${type}s...`)
  console.log(`Criteria: "${criteria.slice(0, 80)}${criteria.length > 80 ? '…' : ''}"`)
  console.log(`Model: ${process.env.SCORING_MODEL ?? 'llama-3.1-8b-instant'}\n`)

  let scored  = 0
  let failed  = 0

  for (const row of records) {
    const ctx = toScoringContext(row as Record<string, unknown>)
    process.stdout.write(`  [${scored + failed + 1}/${records.length}] ${ctx.title?.slice(0, 60)}... `)

    try {
      const result = await scoreItem(ctx, criteria)
      if (type === 'listing') {
        await updateListingScore(ctx.id, result.score, 'scored')
      } else {
        await updateJobScore(ctx.id, result.score, 'scored')
      }
      console.log(`→ ${result.score}/100`)
      scored++
    } catch (err) {
      console.log(`→ FAILED (${err instanceof Error ? err.message : String(err)})`)
      const updateFn = type === 'listing' ? updateListingScore : updateJobScore
      await updateFn(ctx.id, 0, 'failed').catch(() => {/* best-effort */ })
      failed++
    }

    // Small delay to respect Groq rate limits
    await new Promise((r) => setTimeout(r, 100))
  }

  console.log(`\nDone. scored=${scored} failed=${failed}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
