import { and, count, desc, eq, gte, ilike, inArray, lte, sql, getTableColumns } from 'drizzle-orm'
import { db } from '../index'
import { listings } from '../schema'
import { dbListingToDomain, toListingPublic } from '../transformers'
import type { Listing, ListingPublic, ListingFilters, ScoreStatus } from '@/types'

type DbListingInsert = typeof listings.$inferInsert

// ─── Upsert ───────────────────────────────────────────────────────────────────
// Only updates if content_hash changed — prevents unnecessary writes on unchanged listings.

export async function upsertListing(data: DbListingInsert): Promise<Listing | undefined> {
  const [row] = await db
    .insert(listings)
    .values(data)
    .onConflictDoUpdate({
      target: listings.url,
      set: {
        title:        data.title,
        price:        data.price,
        currency:     data.currency,
        area_m2:      data.area_m2,
        rooms:        data.rooms,
        location:     data.location,
        lat:          data.lat,
        lng:          data.lng,
        description:  data.description,
        images:       data.images,
        content_hash: data.content_hash,
        updated_at:   sql`now()`,
      },
      // Only update when content actually changed — preserves updated_at accuracy
      where: sql`listings.content_hash IS DISTINCT FROM excluded.content_hash`,
    })
    .returning()

  return row ? dbListingToDomain(row) : undefined
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getListingById(id: string): Promise<Listing | null> {
  const [row] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1)

  return row ? dbListingToDomain(row) : null
}

// Get by ID without embedding — for API detail responses
export async function getListingByIdPublic(id: string): Promise<ListingPublic | null> {
  const { embedding: _emb, ...cols } = getTableColumns(listings)

  const [row] = await db
    .select(cols)
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1)

  if (!row) return null
  // row has no embedding, cast is safe
  return toListingPublic(dbListingToDomain({ ...row, embedding: null }))
}

// ─── Filtered list (NEVER selects embedding) ──────────────────────────────────

export async function getFilteredListings(filters: ListingFilters): Promise<ListingPublic[]> {
  const { embedding: _emb, ...cols } = getTableColumns(listings)

  const conditions = buildListingConditions(filters)
  const limit  = filters.pageSize ?? 50
  const offset = ((filters.page ?? 1) - 1) * limit

  const rows = await db
    .select(cols)
    .from(listings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(listings.scraped_at))
    .limit(limit)
    .offset(offset)

  return rows.map((row) => toListingPublic(dbListingToDomain({ ...row, embedding: null })))
}

// Count for pagination total (runs a SELECT COUNT(*), not SELECT *).
export async function countFilteredListings(filters: ListingFilters): Promise<number> {
  const conditions = buildListingConditions(filters)

  const [result] = await db
    .select({ total: count() })
    .from(listings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  return result?.total ?? 0
}

// ─── Score update ─────────────────────────────────────────────────────────────

export async function updateListingScore(
  id: string,
  score: number,
  status: ScoreStatus
): Promise<void> {
  await db
    .update(listings)
    .set({
      ai_score:     score,
      score_status: status,
      scored_at:    sql`now()`,
    })
    .where(eq(listings.id, id))
}

// ─── Pending / scored ─────────────────────────────────────────────────────────

export async function getPendingListings(limit: number): Promise<Listing[]> {
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.score_status, 'pending'))
    .limit(limit)

  return rows.map(dbListingToDomain)
}

export async function getMostRecentScoredListing(): Promise<ListingPublic | null> {
  const { embedding: _emb, ...cols } = getTableColumns(listings)

  const [row] = await db
    .select(cols)
    .from(listings)
    .where(eq(listings.score_status, 'scored'))
    .orderBy(desc(listings.scored_at))
    .limit(1)

  if (!row) return null
  return toListingPublic(dbListingToDomain({ ...row, embedding: null }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildListingConditions(filters: ListingFilters) {
  const conditions = []

  if (filters.category)              conditions.push(eq(listings.category, filters.category))
  if (filters.priceMin != null)      conditions.push(gte(listings.price, String(filters.priceMin)))
  if (filters.priceMax != null)      conditions.push(lte(listings.price, String(filters.priceMax)))
  if (filters.areaMin != null)       conditions.push(gte(listings.area_m2, String(filters.areaMin)))
  if (filters.areaMax != null)       conditions.push(lte(listings.area_m2, String(filters.areaMax)))
  if (filters.location)              conditions.push(ilike(listings.location, `%${filters.location}%`))
  if (filters.scoreMin != null)      conditions.push(gte(listings.ai_score, filters.scoreMin))
  if (filters.source?.length)        conditions.push(inArray(listings.source, filters.source))
  if (filters.rooms?.length) {
    conditions.push(inArray(listings.rooms, filters.rooms))
  }

  return conditions
}
