// src/db/queries/search.ts
// Hybrid search (RRF = vector + FTS) for listings and jobs.
// Falls back to FTS-only when HuggingFace embedding is unavailable.
//
// Key design decisions:
//   - hnsw.ef_search=100 via _config CTE (Neon HTTP driver is stateless — SET doesn't persist)
//   - RRF k=60 (canonical)
//   - FULL OUTER JOIN so docs appearing in only one ranking list are not lost
//   - vector_ranked LIMIT 150, fts_ranked LIMIT 200
//   - FTS config: polish_unaccent (everywhere)
//   - embedding column is NEVER selected (~6KB per row)
//   - sql.raw() is used only for the pre-validated float array literal, never for user input

import { sql } from 'drizzle-orm'
import { db } from '../index'
import type { ListingPublic, JobPublic } from '@/types'
import type { ListingFilters, JobFilters } from '@/types'
import type { ListingCategory, EmploymentType } from '@/types'
import { generateEmbedding, buildQueryEmbeddingText } from '@/ai/embeddings'
import { AITask } from '@/ai/client'

// ─── Option types ─────────────────────────────────────────────────────────────

export interface HybridSearchOptions {
  queryEmbedding: number[]
  queryText:      string
  category?:      ListingCategory
  priceMin?:      number
  priceMax?:      number
  areaMin?:       number
  areaMax?:       number
  rooms?:         number[]
  location?:      string
  source?:        string[]
  scoreMin?:      number
  limit:          number
  offset:         number
}

export interface JobHybridSearchOptions {
  queryEmbedding:  number[]
  queryText:       string
  location?:       string
  remote?:         boolean
  salaryMin?:      number
  salaryMax?:      number
  employmentType?: string[]
  techStack?:      string[]
  source?:         string[]
  scoreMin?:       number
  limit:           number
  offset:          number
}

// ─── Row mappers ──────────────────────────────────────────────────────────────
// Raw SQL returns snake_case strings; we must map to camelCase domain types.
// numeric columns (price, area_m2, lat, lng, salary_min, salary_max) come back
// as string | null — always parseFloat().

interface RawListingRow extends Record<string, unknown> {
  id:           string
  category:     string
  source:       string
  url:          string
  title:        string
  price:        string | null
  currency:     string | null
  area_m2:      string | null
  rooms:        number | null
  location:     string | null
  lat:          string | null
  lng:          string | null
  description:  string | null
  images:       string[] | null
  ai_score:     number | null
  score_status: string
  scored_at:    Date | null
  content_hash: string
  scraped_at:   Date
  updated_at:   Date
}

interface RawJobRow extends Record<string, unknown> {
  id:              string
  source:          string
  url:             string
  title:           string
  company:         string | null
  location:        string | null
  salary_min:      string | null
  salary_max:      string | null
  currency:        string | null
  employment_type: string | null
  tech_stack:      string[] | null
  remote:          boolean | null
  description:     string | null
  ai_score:        number | null
  score_status:    string
  scored_at:       Date | null
  content_hash:    string
  scraped_at:      Date
  updated_at:      Date
}

function safeFloat(v: string | null | undefined): number | null {
  if (v == null) return null
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

function mapListingRow(row: RawListingRow): ListingPublic {
  return {
    id:          row.id,
    category:    row.category as ListingPublic['category'],
    source:      row.source   as ListingPublic['source'],
    url:         row.url,
    title:       row.title,
    price:       safeFloat(row.price),
    currency:    row.currency ?? 'PLN',
    areaM2:      safeFloat(row.area_m2),
    rooms:       row.rooms,
    location:    row.location,
    lat:         safeFloat(row.lat),
    lng:         safeFloat(row.lng),
    description: row.description,
    images:      row.images ?? [],
    aiScore:     row.ai_score,
    scoreStatus: row.score_status as ListingPublic['scoreStatus'],
    scoredAt:    row.scored_at,
    contentHash: row.content_hash,
    scrapedAt:   row.scraped_at,
    updatedAt:   row.updated_at,
  }
}

function mapJobRow(row: RawJobRow): JobPublic {
  return {
    id:             row.id,
    source:         row.source          as JobPublic['source'],
    url:            row.url,
    title:          row.title,
    company:        row.company,
    location:       row.location,
    salaryMin:      safeFloat(row.salary_min),
    salaryMax:      safeFloat(row.salary_max),
    currency:       row.currency        ?? 'PLN',
    employmentType: row.employment_type as EmploymentType | null,
    techStack:      row.tech_stack      ?? [],
    remote:         row.remote,
    description:    row.description,
    aiScore:        row.ai_score,
    scoreStatus:    row.score_status    as JobPublic['scoreStatus'],
    scoredAt:       row.scored_at,
    contentHash:    row.content_hash,
    scrapedAt:      row.scraped_at,
    updatedAt:      row.updated_at,
  }
}

// ─── hybridSearchListings ─────────────────────────────────────────────────────

export async function hybridSearchListings(
  opts: HybridSearchOptions
): Promise<ListingPublic[]> {
  const {
    queryEmbedding,
    queryText,
    category,
    priceMin,
    priceMax,
    areaMin,
    areaMax,
    rooms,
    location,
    source,
    scoreMin,
    limit,
    offset,
  } = opts

  // Guard: queryEmbedding comes from generateEmbedding (our model, not user input),
  // but defend against non-finite values before constructing the sql.raw() literal.
  if (!queryEmbedding.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    throw new Error('[search] Invalid queryEmbedding: contains non-finite values')
  }
  const vectorLiteral = `[${queryEmbedding.join(',')}]`

  // Build optional WHERE fragments for filter application inside CTEs.
  // All user values go through parameterized sql`` bindings — never sql.raw().
  const categoryClause    = category  ? sql` AND l.category = ${category}`               : sql``
  const priceMinClause    = priceMin  != null ? sql` AND l.price >= ${priceMin}`         : sql``
  const priceMaxClause    = priceMax  != null ? sql` AND l.price <= ${priceMax}`         : sql``
  const areaMinClause     = areaMin   != null ? sql` AND l.area_m2 >= ${areaMin}`        : sql``
  const areaMaxClause     = areaMax   != null ? sql` AND l.area_m2 <= ${areaMax}`        : sql``
  const locationClause    = location  ? sql` AND l.location ILIKE ${'%' + location + '%'}`  : sql``
  const sourceClause      = source?.length ? sql` AND l.source = ANY(${source})`            : sql``
  const scoreMinClause    = scoreMin  != null ? sql` AND l.ai_score >= ${scoreMin}`         : sql``

  // rooms: IN list — only add if non-empty
  const roomsClause = rooms?.length
    ? sql` AND l.rooms = ANY(${rooms})`
    : sql``

  const filterClauses = sql`${categoryClause}${priceMinClause}${priceMaxClause}${areaMinClause}${areaMaxClause}${locationClause}${sourceClause}${scoreMinClause}${roomsClause}`

  const rows = await db.execute<RawListingRow>(sql`
    WITH
      _config AS (
        SELECT set_config('hnsw.ef_search', '100', true)
      ),
      vector_ranked AS (
        SELECT
          l.id,
          ROW_NUMBER() OVER (ORDER BY l.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}) AS rank
        FROM listings l, _config
        WHERE l.embedding IS NOT NULL
          ${filterClauses}
        LIMIT 150
      ),
      fts_ranked AS (
        SELECT
          l.id,
          ROW_NUMBER() OVER (
            ORDER BY ts_rank_cd(l.fts, websearch_to_tsquery('polish_unaccent', ${queryText}), 32) DESC
          ) AS rank
        FROM listings l
        WHERE l.fts @@ websearch_to_tsquery('polish_unaccent', ${queryText})
          ${filterClauses}
        LIMIT 200
      ),
      rrf AS (
        SELECT
          COALESCE(v.id, f.id) AS id,
          COALESCE(1.0 / (60.0 + v.rank), 0) + COALESCE(1.0 / (60.0 + f.rank), 0) AS rrf_score
        FROM vector_ranked v
        FULL OUTER JOIN fts_ranked f ON v.id = f.id
      )
    SELECT
      l.id,
      l.category,
      l.source,
      l.url,
      l.title,
      l.price,
      l.currency,
      l.area_m2,
      l.rooms,
      l.location,
      l.lat,
      l.lng,
      l.description,
      l.images,
      l.ai_score,
      l.score_status,
      l.scored_at,
      l.content_hash,
      l.scraped_at,
      l.updated_at
    FROM rrf
    JOIN listings l ON l.id = rrf.id
    ORDER BY rrf.rrf_score DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.rows.map(mapListingRow)
}

// ─── hybridSearchJobs ─────────────────────────────────────────────────────────

export async function hybridSearchJobs(
  opts: JobHybridSearchOptions
): Promise<JobPublic[]> {
  const {
    queryEmbedding,
    queryText,
    location,
    remote,
    salaryMin,
    salaryMax,
    employmentType,
    techStack,
    source,
    scoreMin,
    limit,
    offset,
  } = opts

  if (!queryEmbedding.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    throw new Error('[search] Invalid queryEmbedding: contains non-finite values')
  }
  const vectorLiteral = `[${queryEmbedding.join(',')}]`

  const locationClause       = location       ? sql` AND j.location ILIKE ${'%' + location + '%'}` : sql``
  const remoteClause         = remote != null  ? sql` AND j.remote = ${remote}`                     : sql``
  const salaryMinClause      = salaryMin != null ? sql` AND j.salary_min >= ${salaryMin}`           : sql``
  const salaryMaxClause      = salaryMax != null ? sql` AND j.salary_max <= ${salaryMax}`           : sql``
  const sourceClause         = source?.length  ? sql` AND j.source = ANY(${source})`               : sql``
  const scoreMinClause       = scoreMin != null ? sql` AND j.ai_score >= ${scoreMin}`              : sql``
  const employmentTypeClause = employmentType?.length
    ? sql` AND j.employment_type = ANY(${employmentType})`
    : sql``
  const techStackClause = techStack?.length
    ? sql` AND j.tech_stack && ${techStack}`
    : sql``

  const filterClauses = sql`${locationClause}${remoteClause}${salaryMinClause}${salaryMaxClause}${sourceClause}${scoreMinClause}${employmentTypeClause}${techStackClause}`

  const rows = await db.execute<RawJobRow>(sql`
    WITH
      _config AS (
        SELECT set_config('hnsw.ef_search', '100', true)
      ),
      vector_ranked AS (
        SELECT
          j.id,
          ROW_NUMBER() OVER (ORDER BY j.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}) AS rank
        FROM jobs j, _config
        WHERE j.embedding IS NOT NULL
          ${filterClauses}
        LIMIT 150
      ),
      fts_ranked AS (
        SELECT
          j.id,
          ROW_NUMBER() OVER (
            ORDER BY ts_rank_cd(j.fts, websearch_to_tsquery('polish_unaccent', ${queryText}), 32) DESC
          ) AS rank
        FROM jobs j
        WHERE j.fts @@ websearch_to_tsquery('polish_unaccent', ${queryText})
          ${filterClauses}
        LIMIT 200
      ),
      rrf AS (
        SELECT
          COALESCE(v.id, f.id) AS id,
          COALESCE(1.0 / (60.0 + v.rank), 0) + COALESCE(1.0 / (60.0 + f.rank), 0) AS rrf_score
        FROM vector_ranked v
        FULL OUTER JOIN fts_ranked f ON v.id = f.id
      )
    SELECT
      j.id,
      j.source,
      j.url,
      j.title,
      j.company,
      j.location,
      j.salary_min,
      j.salary_max,
      j.currency,
      j.employment_type,
      j.tech_stack,
      j.remote,
      j.description,
      j.ai_score,
      j.score_status,
      j.scored_at,
      j.content_hash,
      j.scraped_at,
      j.updated_at
    FROM rrf
    JOIN jobs j ON j.id = rrf.id
    ORDER BY rrf.rrf_score DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.rows.map(mapJobRow)
}

// ─── ftsOnlySearchListings ────────────────────────────────────────────────────

export async function ftsOnlySearchListings(
  queryText: string,
  category:  ListingCategory | undefined,
  limit:     number,
  offset:    number
): Promise<ListingPublic[]> {
  const categoryClause = category ? sql` AND l.category = ${category}` : sql``

  const rows = await db.execute<RawListingRow>(sql`
    SELECT
      l.id,
      l.category,
      l.source,
      l.url,
      l.title,
      l.price,
      l.currency,
      l.area_m2,
      l.rooms,
      l.location,
      l.lat,
      l.lng,
      l.description,
      l.images,
      l.ai_score,
      l.score_status,
      l.scored_at,
      l.content_hash,
      l.scraped_at,
      l.updated_at
    FROM listings l
    WHERE l.fts @@ websearch_to_tsquery('polish_unaccent', ${queryText})
      ${categoryClause}
    ORDER BY ts_rank_cd(l.fts, websearch_to_tsquery('polish_unaccent', ${queryText}), 32) DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.rows.map(mapListingRow)
}

// ─── ftsOnlySearchJobs ────────────────────────────────────────────────────────

export interface JobFtsFilters {
  location?:       string
  remote?:         boolean
  salaryMin?:      number
  salaryMax?:      number
  employmentType?: EmploymentType[]
  techStack?:      string[]
  source?:         string[]
  scoreMin?:       number
}

export async function ftsOnlySearchJobs(
  queryText: string,
  filters:   JobFtsFilters,
  limit:     number,
  offset:    number
): Promise<JobPublic[]> {
  const locationClause       = filters.location       ? sql` AND j.location ILIKE ${'%' + filters.location + '%'}`      : sql``
  const remoteClause         = filters.remote != null  ? sql` AND j.remote = ${filters.remote}`                          : sql``
  const salaryMinClause      = filters.salaryMin != null ? sql` AND j.salary_min >= ${filters.salaryMin}` : sql``
  const salaryMaxClause      = filters.salaryMax != null ? sql` AND j.salary_max <= ${filters.salaryMax}` : sql``
  const sourceClause         = filters.source?.length  ? sql` AND j.source = ANY(${filters.source})`                    : sql``
  const scoreMinClause       = filters.scoreMin != null ? sql` AND j.ai_score >= ${filters.scoreMin}`                   : sql``
  const employmentTypeClause = filters.employmentType?.length
    ? sql` AND j.employment_type = ANY(${filters.employmentType})`
    : sql``
  const techStackClause = filters.techStack?.length
    ? sql` AND j.tech_stack && ${filters.techStack}`
    : sql``

  const filterClauses = sql`${locationClause}${remoteClause}${salaryMinClause}${salaryMaxClause}${sourceClause}${scoreMinClause}${employmentTypeClause}${techStackClause}`

  const rows = await db.execute<RawJobRow>(sql`
    SELECT
      j.id,
      j.source,
      j.url,
      j.title,
      j.company,
      j.location,
      j.salary_min,
      j.salary_max,
      j.currency,
      j.employment_type,
      j.tech_stack,
      j.remote,
      j.description,
      j.ai_score,
      j.score_status,
      j.scored_at,
      j.content_hash,
      j.scraped_at,
      j.updated_at
    FROM jobs j
    WHERE j.fts @@ websearch_to_tsquery('polish_unaccent', ${queryText})
      ${filterClauses}
    ORDER BY ts_rank_cd(j.fts, websearch_to_tsquery('polish_unaccent', ${queryText}), 32) DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  return rows.rows.map(mapJobRow)
}

// ─── searchListings — top-level with HF embedding fallback ───────────────────

export async function searchListings(
  queryText: string,
  filters:   ListingFilters
): Promise<ListingPublic[]> {
  const trimmedQuery = queryText.trim()
  const limit  = filters.pageSize ?? 50
  const offset = ((filters.page ?? 1) - 1) * limit

  // Empty query: caller should use getFilteredListings for browse mode
  if (trimmedQuery.length === 0) return []

  if (trimmedQuery.length < 3) {
    return ftsOnlySearchListings(trimmedQuery, filters.category, limit, offset)
  }

  let queryEmbedding: number[] | null = null
  try {
    queryEmbedding = await generateEmbedding(
      buildQueryEmbeddingText(trimmedQuery),
      AITask.EMBED_QUERY
    )
  } catch (err) {
    console.warn('[search] HuggingFace embedding failed, falling back to FTS-only', err)
  }

  if (!queryEmbedding) {
    return ftsOnlySearchListings(trimmedQuery, filters.category, limit, offset)
  }

  return hybridSearchListings({
    queryEmbedding,
    queryText:  trimmedQuery,
    category:   filters.category,
    priceMin:   filters.priceMin,
    priceMax:   filters.priceMax,
    areaMin:    filters.areaMin,
    areaMax:    filters.areaMax,
    rooms:      filters.rooms,
    location:   filters.location,
    source:     filters.source,
    scoreMin:   filters.scoreMin,
    limit,
    offset,
  })
}

// ─── searchJobs — top-level with HF embedding fallback ───────────────────────

export async function searchJobs(
  queryText: string,
  filters:   JobFilters
): Promise<JobPublic[]> {
  const trimmedQuery = queryText.trim()
  const limit  = filters.pageSize ?? 50
  const offset = ((filters.page ?? 1) - 1) * limit

  const ftsFilters: JobFtsFilters = {
    location:       filters.location,
    remote:         filters.remote,
    salaryMin:      filters.salaryMin,
    salaryMax:      filters.salaryMax,
    employmentType: filters.employmentType,
    techStack:      filters.techStack,
    source:         filters.source,
    scoreMin:       filters.scoreMin,
  }

  if (trimmedQuery.length === 0) return []

  if (trimmedQuery.length < 3) {
    return ftsOnlySearchJobs(trimmedQuery, ftsFilters, limit, offset)
  }

  let queryEmbedding: number[] | null = null
  try {
    queryEmbedding = await generateEmbedding(
      buildQueryEmbeddingText(trimmedQuery),
      AITask.EMBED_QUERY
    )
  } catch (err) {
    console.warn('[search] HuggingFace embedding failed, falling back to FTS-only', err)
  }

  if (!queryEmbedding) {
    return ftsOnlySearchJobs(trimmedQuery, ftsFilters, limit, offset)
  }

  return hybridSearchJobs({
    queryEmbedding,
    queryText:      trimmedQuery,
    location:       filters.location,
    remote:         filters.remote,
    salaryMin:      filters.salaryMin,
    salaryMax:      filters.salaryMax,
    employmentType: filters.employmentType,
    techStack:      filters.techStack,
    source:         filters.source,
    scoreMin:       filters.scoreMin,
    limit,
    offset,
  })
}
