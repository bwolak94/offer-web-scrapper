// src/pipeline/watch-evaluator.ts
// Two-stage watch evaluator — called after each item is scored.
// Stage 1: vector pre-filter (or load all active watches if no item embedding)
// Stage 2: in-memory filter match + per-watch scoring + notification dispatch
// Must never throw — the scoring worker swallows errors from this call.

import { getListingById } from '@/db/queries/listings'
import { getJobById } from '@/db/queries/jobs'
import { findWatchCandidatesByEmbedding, findFilterOnlyWatches, listWatches } from '@/db/queries/watches'
import { scoreItem } from '@/ai/scorer'
import { sendNotification } from '@/notify/index'
import type { Listing, Job, ScoringContext, Watch } from '@/types'
import type { DbWatch } from '@/db/queries/watches'

// ─── DB → domain mapper for Watch ────────────────────────────────────────────
// DbWatch uses snake_case; Watch (domain) uses camelCase.

function dbWatchToDomain(row: DbWatch): Watch {
  return {
    id:               row.id,
    type:             row.type,
    filters:          row.filters as Watch['filters'],
    criteria:         row.criteria ?? null,
    criteriaEmbedding: row.criteria_embedding as unknown as number[] | null,
    minScore:         row.min_score,
    notifyEmail:      row.notify_email ?? null,
    notifyWebhook:    row.notify_webhook ?? null,
    active:           row.active,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  }
}

// ─── Filter match (pure in-memory) ───────────────────────────────────────────

function checkFiltersMatch(
  item: Listing | Job,
  watch: Watch
): boolean {
  const filters = watch.filters as Record<string, unknown>

  if (watch.type === 'listing') {
    const listing = item as Listing

    if (filters.category != null && listing.category !== filters.category) return false

    if (filters.priceMin != null && typeof filters.priceMin === 'number') {
      if (listing.price == null || listing.price < filters.priceMin) return false
    }
    if (filters.priceMax != null && typeof filters.priceMax === 'number') {
      if (listing.price == null || listing.price > filters.priceMax) return false
    }
    if (filters.areaMin != null && typeof filters.areaMin === 'number') {
      if (listing.areaM2 == null || listing.areaM2 < filters.areaMin) return false
    }
    if (filters.areaMax != null && typeof filters.areaMax === 'number') {
      if (listing.areaM2 == null || listing.areaM2 > filters.areaMax) return false
    }
    if (Array.isArray(filters.rooms) && (filters.rooms as number[]).length > 0) {
      if (listing.rooms == null || !(filters.rooms as number[]).includes(listing.rooms)) return false
    }
    if (filters.location != null && typeof filters.location === 'string' && filters.location.length > 0) {
      if (!listing.location?.toLowerCase().includes(filters.location.toLowerCase())) return false
    }
    if (filters.scoreMin != null && typeof filters.scoreMin === 'number') {
      if (listing.aiScore == null || listing.aiScore < filters.scoreMin) return false
    }

    return true
  }

  if (watch.type === 'job') {
    const job = item as Job

    if (filters.remote != null) {
      if (job.remote !== filters.remote) return false
    }
    if (filters.location != null && typeof filters.location === 'string' && filters.location.length > 0) {
      if (!job.location?.toLowerCase().includes((filters.location as string).toLowerCase())) return false
    }
    if (filters.salaryMin != null && typeof filters.salaryMin === 'number') {
      if (job.salaryMin == null || job.salaryMin < filters.salaryMin) return false
    }
    if (filters.salaryMax != null && typeof filters.salaryMax === 'number') {
      if (job.salaryMax == null || job.salaryMax > filters.salaryMax) return false
    }
    if (Array.isArray(filters.employmentType) && (filters.employmentType as string[]).length > 0) {
      if (job.employmentType == null || !(filters.employmentType as string[]).includes(job.employmentType)) return false
    }
    if (Array.isArray(filters.techStack) && (filters.techStack as string[]).length > 0) {
      const watchStack = filters.techStack as string[]
      const hasAny = watchStack.some((t) =>
        job.techStack.map((s) => s.toLowerCase()).includes(t.toLowerCase())
      )
      if (!hasAny) return false
    }
    if (filters.scoreMin != null && typeof filters.scoreMin === 'number') {
      if (job.aiScore == null || job.aiScore < filters.scoreMin) return false
    }

    return true
  }

  return false
}

// ─── Build ScoringContext from domain item ────────────────────────────────────

function buildScoringContext(item: Listing | Job): ScoringContext {
  if ('category' in item) {
    // Listing
    const listing = item as Listing
    const pricePerM2 =
      listing.price != null && listing.areaM2 != null && listing.areaM2 > 0
        ? Math.round(listing.price / listing.areaM2)
        : null

    return {
      id:          listing.id,
      type:        'listing',
      title:       listing.title,
      price:       listing.price,
      pricePerM2,
      areaM2:      listing.areaM2,
      rooms:       listing.rooms,
      location:    listing.location,
      currency:    listing.currency,
      description: listing.description,
    }
  } else {
    // Job
    const job = item as Job
    return {
      id:             job.id,
      type:           'job',
      title:          job.title,
      location:       job.location,
      salaryMin:      job.salaryMin,
      salaryMax:      job.salaryMax,
      currency:       job.currency,
      techStack:      job.techStack,
      remote:         job.remote,
      employmentType: job.employmentType,
      description:    job.description,
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function checkAfterScoring(
  refId:   string,
  refType: 'listing' | 'job',
  score:   number
): Promise<void> {
  try {
    // Stage 1: Load the full item (including embedding)
    const item: Listing | Job | null =
      refType === 'listing'
        ? await getListingById(refId)
        : await getJobById(refId)

    if (!item) {
      console.warn('[watch-evaluator] Item not found', { refId, refType })
      return
    }

    // Stage 1: Get watch candidates — vector pre-filter if embedding available, else all active
    let dbWatchCandidates: DbWatch[]

    if (item.embedding && item.embedding.length > 0) {
      // Stage 1: vector pre-filter for watches that have criteria_embedding
      const vectorCandidates = await findWatchCandidatesByEmbedding(item.embedding, refType, 50)
      // Also include filter-only watches (no criteria_embedding) — they always participate
      const filterOnlyCandidates = await findFilterOnlyWatches(refType)
      // Merge, deduplicating by id (shouldn't overlap but be safe)
      const seen = new Set<string>()
      for (const w of vectorCandidates) seen.add(w.id)
      dbWatchCandidates = [
        ...vectorCandidates,
        ...filterOnlyCandidates.filter(w => !seen.has(w.id)),
      ]
    } else {
      // No item embedding — fall back to all active watches of this type
      dbWatchCandidates = await listWatches(refType)
    }

    if (dbWatchCandidates.length === 0) return

    const scoringCtx = buildScoringContext(item)

    // Stage 2: For each candidate, apply filter match + scoring + dedup + notify.
    // Sequential loop is intentional (no Promise.all) — one broken watch must not
    // stop others. NOTE: at 50 candidates with cold Groq calls (~300–800 ms each)
    // this can take 15–40 s. If this becomes a timeout concern, move evaluation to
    // a dedicated QStash job (/api/watches/evaluate) with its own maxDuration.
    for (const dbWatch of dbWatchCandidates) {
      try {
        const watch = dbWatchToDomain(dbWatch)

        if (!watch.active) continue

        // In-memory filter match
        if (!checkFiltersMatch(item, watch)) continue

        // Determine effective score for this watch
        let effectiveScore: number

        if (watch.criteria) {
          // Watch has its own criteria — re-score against them
          const result = await scoreItem(scoringCtx, watch.criteria)
          effectiveScore = result.score
        } else {
          // No watch criteria — use the pipeline score passed in
          effectiveScore = score
        }

        if (effectiveScore < watch.minScore) continue

        // Build public item shape (strip embedding)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { embedding: _emb, ...itemPublic } = item as Listing & { embedding: unknown }

        await sendNotification(watch, itemPublic as Parameters<typeof sendNotification>[1], refType)
      } catch (watchErr) {
        console.error('[watch-evaluator] Error processing watch candidate', {
          watchId: dbWatch.id,
          refId,
          err: watchErr instanceof Error ? watchErr.message : String(watchErr),
        })
      }
    }
  } catch (err) {
    // Must never throw — the scoring worker swallows errors from this call
    console.error('[watch-evaluator] Unexpected error in checkAfterScoring', {
      refId,
      refType,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}
