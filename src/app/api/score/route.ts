// src/app/api/score/route.ts
// POST /api/score — on-demand AI scoring with cache, preview mode support.

import { NextRequest, NextResponse } from 'next/server'
import { ScoreRequestSchema } from '@/lib/schemas'
import { getScoreRatelimit, getIp } from '@/lib/ratelimit'
import { scoreItem, buildScorerCriteriaHash } from '@/ai/scorer'
import { getScoreCache } from '@/db/queries/score-cache'
import { getMostRecentScoredListing, getListingByIdPublic } from '@/db/queries/listings'
import { getMostRecentScoredJob, getJobByIdPublic } from '@/db/queries/jobs'
import type { ScoringContext, ListingPublic, JobPublic } from '@/types'

export const maxDuration = 30

// ─── ScoringContext builders ──────────────────────────────────────────────────

function listingToScoringContext(listing: ListingPublic): ScoringContext {
  return {
    id:          listing.id,
    type:        'listing',
    title:       listing.title,
    price:       listing.price,
    areaM2:      listing.areaM2,
    rooms:       listing.rooms,
    location:    listing.location,
    currency:    listing.currency,
    description: listing.description,
  }
}

function jobToScoringContext(job: JobPublic): ScoringContext {
  return {
    id:             job.id,
    type:           'job',
    title:          job.title,
    location:       job.location,
    salaryMin:      job.salaryMin,
    salaryMax:      job.salaryMax,
    currency:       job.currency,
    employmentType: job.employmentType ?? undefined,
    techStack:      job.techStack,
    remote:         job.remote,
    description:    job.description,
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── Rate limit ──────────────────────────────────────────────────────────
    const ip = getIp(req)
    const { success } = await getScoreRatelimit().limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
    }

    const parsed = ScoreRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message })) },
        { status: 400 }
      )
    }

    const { type, id, criteria, preview } = parsed.data

    // ── Resolve the record to score ─────────────────────────────────────────
    let ctx: ScoringContext
    let recordId: string

    if (preview === true) {
      // Preview mode: use the most recently scored record of this type
      if (type === 'listing') {
        const record = await getMostRecentScoredListing()
        if (!record) {
          return NextResponse.json(
            { error: 'NO_SCORED_LISTING_FOUND' },
            { status: 404 }
          )
        }
        ctx = listingToScoringContext(record)
        recordId = record.id
      } else {
        const record = await getMostRecentScoredJob()
        if (!record) {
          return NextResponse.json(
            { error: 'NO_SCORED_JOB_FOUND' },
            { status: 404 }
          )
        }
        ctx = jobToScoringContext(record)
        recordId = record.id
      }
    } else {
      // Normal mode: id is guaranteed to be defined (enforced by .refine())
      const safeId = id!

      if (type === 'listing') {
        const record = await getListingByIdPublic(safeId)
        if (!record) {
          return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
        }
        ctx = listingToScoringContext(record)
        recordId = record.id
      } else {
        const record = await getJobByIdPublic(safeId)
        if (!record) {
          return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
        }
        ctx = jobToScoringContext(record)
        recordId = record.id
      }
    }

    // ── Cache check ─────────────────────────────────────────────────────────
    // Use buildScorerCriteriaHash — the same function scoreItem uses internally —
    // so the cache key is always identical between the pre-check here and the
    // write that scoreItem performs.  buildCriteriaHash (score-cache.ts) was an
    // identical duplicate and has been removed from this import.
    const criteriaHash = buildScorerCriteriaHash(criteria)
    const cached = await getScoreCache(recordId, type, criteriaHash)
    if (cached) {
      return NextResponse.json({
        id:        recordId,
        score:     cached.score,
        reasoning: cached.reason ?? '',
        cached:    true,
      })
    }

    // ── Score ───────────────────────────────────────────────────────────────
    // scoreItem handles its own cache write internally — no second setScoreCache
    // call here.  A duplicate write would cause a harmless no-op (onConflictDoNothing)
    // on the first concurrent request but a race on the second; removing it keeps
    // the write path as a single responsibility inside scorer.ts.
    let score: number
    let reason: string | null

    try {
      const result = await scoreItem(ctx, criteria)
      score  = result.score
      reason = result.reason
    } catch (scoringErr) {
      console.error('[POST /api/score] Scoring failed', scoringErr)
      return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 })
    }

    return NextResponse.json({
      id:        recordId,
      score,
      reasoning: reason ?? '',
      cached:    false,
    })
  } catch (err) {
    console.error('[POST /api/score] Unexpected error', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
