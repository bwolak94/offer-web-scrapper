import { createHash } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '../index'
import { scoreCache } from '../schema'

export function buildCriteriaHash(criteria: string): string {
  const normalized = criteria.trim().toLowerCase().replace(/\s+/g, ' ')
  return createHash('sha256').update(normalized).digest('hex')
}

export async function getScoreCache(
  refId: string,
  refType: 'listing' | 'job',
  criteriaHash: string
): Promise<{ score: number; reason: string | null } | null> {
  const [row] = await db
    .select({
      score:  scoreCache.score,
      reason: scoreCache.reason,
    })
    .from(scoreCache)
    .where(
      and(
        eq(scoreCache.ref_id, refId),
        eq(scoreCache.ref_type, refType),
        eq(scoreCache.criteria_hash, criteriaHash)
      )
    )
    .limit(1)

  return row ?? null
}

export async function setScoreCache(entry: {
  refId:        string
  refType:      'listing' | 'job'
  criteriaHash: string
  model:        string
  score:        number
  reason?:      string
}): Promise<void> {
  await db
    .insert(scoreCache)
    .values({
      ref_id:        entry.refId,
      ref_type:      entry.refType,
      criteria_hash: entry.criteriaHash,
      model:         entry.model,
      score:         entry.score,
      reason:        entry.reason ?? null,
    })
    .onConflictDoNothing()
}
