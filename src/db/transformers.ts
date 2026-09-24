// src/db/transformers.ts
// Converts Drizzle DbListing / DbJob (snake_case, numeric as string) to
// camelCase domain types with proper number values.
//
// ⚠ Drizzle's numeric() columns return string | null from $inferSelect.
//   Always call parseFloat() — never assume the value is already a number.

import type { InferSelectModel } from 'drizzle-orm'
import { listings, jobs } from './schema'
import type {
  Listing,
  ListingPublic,
  Job,
  JobPublic,
  ScoreStatus,
} from '@/types'
import type { ListingCategory, RealEstateSource, JobSource, EmploymentType } from '@/types'

export type DbListing = InferSelectModel<typeof listings>
export type DbJob     = InferSelectModel<typeof jobs>

export function dbListingToDomain(row: DbListing): Listing {
  return {
    id:          row.id,
    category:    row.category as ListingCategory,
    source:      row.source as RealEstateSource,
    url:         row.url,
    title:       row.title,
    price:       row.price   != null ? parseFloat(row.price)   : null,
    currency:    row.currency ?? 'PLN',
    areaM2:      row.area_m2 != null ? parseFloat(row.area_m2) : null,
    rooms:       row.rooms,
    location:    row.location,
    lat:         row.lat     != null ? parseFloat(row.lat)     : null,
    lng:         row.lng     != null ? parseFloat(row.lng)     : null,
    description: row.description,
    images:      row.images ?? [],
    aiScore:     row.ai_score,
    scoreStatus: row.score_status as ScoreStatus,
    scoredAt:    row.scored_at,
    embedding:   row.embedding as number[] | null,
    contentHash: row.content_hash,
    scrapedAt:   row.scraped_at,
    updatedAt:   row.updated_at,
  }
}

export function toListingPublic(listing: Listing): ListingPublic {
  const { embedding: _emb, ...pub } = listing
  return pub
}

export function dbJobToDomain(row: DbJob): Job {
  return {
    id:             row.id,
    source:         row.source as JobSource,
    url:            row.url,
    title:          row.title,
    company:        row.company,
    location:       row.location,
    salaryMin:      row.salary_min != null ? parseFloat(row.salary_min) : null,
    salaryMax:      row.salary_max != null ? parseFloat(row.salary_max) : null,
    currency:       row.currency ?? 'PLN',
    employmentType: row.employment_type as EmploymentType | null,
    techStack:      row.tech_stack ?? [],
    remote:         row.remote,
    description:    row.description,
    aiScore:        row.ai_score,
    scoreStatus:    row.score_status as ScoreStatus,
    scoredAt:       row.scored_at,
    embedding:      row.embedding as number[] | null,
    contentHash:    row.content_hash,
    scrapedAt:      row.scraped_at,
    updatedAt:      row.updated_at,
  }
}

export function toJobPublic(job: Job): JobPublic {
  const { embedding: _emb, ...pub } = job
  return pub
}
