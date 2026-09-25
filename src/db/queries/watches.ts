import { and, eq, sql } from 'drizzle-orm'
import { db } from '../index'
import { watches } from '../schema'
import type { WatchType } from '@/types'

export type DbWatch       = typeof watches.$inferSelect
export type DbWatchInsert = typeof watches.$inferInsert

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createWatch(data: DbWatchInsert): Promise<DbWatch> {
  const [row] = await db
    .insert(watches)
    .values(data)
    .returning()

  if (!row) throw new Error('Watch insert returned no row')
  return row
}

export async function getWatchById(id: string): Promise<DbWatch | null> {
  const [row] = await db
    .select()
    .from(watches)
    .where(eq(watches.id, id))
    .limit(1)

  return row ?? null
}

export async function listWatches(type?: WatchType): Promise<DbWatch[]> {
  return db
    .select()
    .from(watches)
    .where(
      and(
        eq(watches.active, true),
        type != null ? eq(watches.type, type) : undefined
      )
    )
}

export async function updateWatch(
  id: string,
  data: Partial<DbWatchInsert>
): Promise<DbWatch | null> {
  const [row] = await db
    .update(watches)
    .set({ ...data, updated_at: sql`now()` })
    .where(eq(watches.id, id))
    .returning()

  return row ?? null
}

export async function deleteWatch(id: string): Promise<boolean> {
  const result = await db
    .delete(watches)
    .where(eq(watches.id, id))
    .returning({ id: watches.id })

  return result.length > 0
}

// ─── Two-stage candidate matching ────────────────────────────────────────────

// Stage 1 — vector pre-filter: watches whose criteria_embedding is similar to the item's embedding.
// Uses cosine distance (<=>). Returns up to `limit` candidate watches for Stage 2 scoring.
export async function findWatchCandidatesByEmbedding(
  embedding: number[],
  type: WatchType,
  limit: number
): Promise<DbWatch[]> {
  // Guard against sql.raw injection: a compromised Ollama endpoint could return
  // non-finite values that would land verbatim inside the raw SQL string.
  if (!embedding.every((x) => typeof x === 'number' && isFinite(x))) {
    // Warn and return empty rather than throw — a compromised HuggingFace response
    // should not silently swallow the error in the outer try/catch of checkAfterScoring.
    console.warn('[watches] findWatchCandidatesByEmbedding: invalid embedding (non-finite values), skipping vector search')
    return []
  }

  const vectorLiteral = `[${embedding.map(x => x.toFixed(8)).join(',')}]`

  return db
    .select()
    .from(watches)
    .where(
      and(
        eq(watches.type, type),
        eq(watches.active, true),
        sql`criteria_embedding IS NOT NULL`
      )
    )
    .orderBy(sql`criteria_embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}`)
    .limit(limit)
}

// Returns all active watches of a given type that have no criteria_embedding.
// These are filter-only watches — they participate in Stage 2 filter matching
// but skip Stage 1 vector pre-filter (they have nothing to compare against).
export async function findFilterOnlyWatches(type: WatchType, limit = 200): Promise<DbWatch[]> {
  return db
    .select()
    .from(watches)
    .where(
      and(
        eq(watches.type, type),
        eq(watches.active, true),
        sql`criteria_embedding IS NULL`
      )
    )
    .limit(limit)
}

// Stage 2 — filter match: watches whose structured JSONB filters match the item.
export async function findMatchingWatches(
  item: { price?: number | null; location?: string | null; category?: string },
  type: WatchType
): Promise<DbWatch[]> {
  return db
    .select()
    .from(watches)
    .where(
      and(
        eq(watches.type, type),
        eq(watches.active, true),
        // Price range checks using JSONB operators
        sql`(${watches.filters}->>'priceMin' IS NULL OR ${item.price ?? null}::numeric >= (${watches.filters}->>'priceMin')::numeric)`,
        sql`(${watches.filters}->>'priceMax' IS NULL OR ${item.price ?? null}::numeric <= (${watches.filters}->>'priceMax')::numeric)`,
        // Category check
        item.category != null
          ? sql`(${watches.filters}->>'category' IS NULL OR ${watches.filters}->>'category' = ${item.category})`
          : undefined,
        // Location substring check
        item.location != null
          ? sql`(${watches.filters}->>'location' IS NULL OR ${item.location} ILIKE '%' || (${watches.filters}->>'location') || '%')`
          : undefined
      )
    )
}
