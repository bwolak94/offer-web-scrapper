import { and, count, desc, eq, gte, ilike, inArray, lte, sql, getTableColumns } from 'drizzle-orm'
import { db } from '../index'
import { jobs } from '../schema'
import { dbJobToDomain, toJobPublic } from '../transformers'
import type { Job, JobPublic, JobFilters, ScoreStatus } from '@/types'

type DbJobInsert = typeof jobs.$inferInsert

// ─── Upsert ───────────────────────────────────────────────────────────────────

export async function upsertJob(data: DbJobInsert): Promise<Job | undefined> {
  const [row] = await db
    .insert(jobs)
    .values(data)
    .onConflictDoUpdate({
      target: jobs.url,
      set: {
        title:           data.title,
        company:         data.company,
        location:        data.location,
        salary_min:      data.salary_min,
        salary_max:      data.salary_max,
        currency:        data.currency,
        employment_type: data.employment_type,
        tech_stack:      data.tech_stack,
        remote:          data.remote,
        description:     data.description,
        content_hash:    data.content_hash,
        updated_at:      sql`now()`,
      },
      where: sql`jobs.content_hash IS DISTINCT FROM excluded.content_hash`,
    })
    .returning()

  return row ? dbJobToDomain(row) : undefined
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getJobById(id: string): Promise<Job | null> {
  const [row] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1)

  return row ? dbJobToDomain(row) : null
}

export async function getJobByIdPublic(id: string): Promise<JobPublic | null> {
  const { embedding: _emb, ...cols } = getTableColumns(jobs)

  const [row] = await db
    .select(cols)
    .from(jobs)
    .where(eq(jobs.id, id))
    .limit(1)

  if (!row) return null
  return toJobPublic(dbJobToDomain({ ...row, embedding: null }))
}

// ─── Filtered list (NEVER selects embedding) ──────────────────────────────────

export async function getFilteredJobs(filters: JobFilters): Promise<JobPublic[]> {
  const { embedding: _emb, ...cols } = getTableColumns(jobs)

  const conditions = buildJobConditions(filters)
  const limit  = filters.pageSize ?? 50
  const offset = ((filters.page ?? 1) - 1) * limit

  const rows = await db
    .select(cols)
    .from(jobs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(jobs.scraped_at))
    .limit(limit)
    .offset(offset)

  return rows.map((row) => toJobPublic(dbJobToDomain({ ...row, embedding: null })))
}

export async function countFilteredJobs(filters: JobFilters): Promise<number> {
  const conditions = buildJobConditions(filters)

  const [result] = await db
    .select({ total: count() })
    .from(jobs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)

  return result?.total ?? 0
}

// ─── Score update ─────────────────────────────────────────────────────────────

export async function updateJobScore(
  id: string,
  score: number,
  status: ScoreStatus
): Promise<void> {
  await db
    .update(jobs)
    .set({
      ai_score:     score,
      score_status: status,
      scored_at:    sql`now()`,
    })
    .where(eq(jobs.id, id))
}

// ─── Pending / scored ─────────────────────────────────────────────────────────

export async function getPendingJobs(limit: number): Promise<Job[]> {
  const rows = await db
    .select()
    .from(jobs)
    .where(eq(jobs.score_status, 'pending'))
    .limit(limit)

  return rows.map(dbJobToDomain)
}

export async function getMostRecentScoredJob(): Promise<JobPublic | null> {
  const { embedding: _emb, ...cols } = getTableColumns(jobs)

  const [row] = await db
    .select(cols)
    .from(jobs)
    .where(eq(jobs.score_status, 'scored'))
    .orderBy(desc(jobs.scored_at))
    .limit(1)

  if (!row) return null
  return toJobPublic(dbJobToDomain({ ...row, embedding: null }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildJobConditions(filters: JobFilters) {
  const conditions = []

  if (filters.location)              conditions.push(ilike(jobs.location, `%${filters.location}%`))
  if (filters.remote != null)        conditions.push(eq(jobs.remote, filters.remote))
  if (filters.salaryMin != null)     conditions.push(gte(jobs.salary_min, String(filters.salaryMin)))
  if (filters.salaryMax != null)     conditions.push(lte(jobs.salary_max, String(filters.salaryMax)))
  if (filters.scoreMin != null)      conditions.push(gte(jobs.ai_score, filters.scoreMin))
  if (filters.source?.length)        conditions.push(inArray(jobs.source, filters.source))
  if (filters.employmentType?.length) conditions.push(inArray(jobs.employment_type, filters.employmentType))
  if (filters.techStack?.length) {
    // Safe: techStack is validated as string[] before use (never raw user string)
    conditions.push(sql`tech_stack && ${filters.techStack}::text[]`)
  }

  return conditions
}
