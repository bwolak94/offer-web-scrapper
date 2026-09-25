import { z } from 'zod'
import { RealEstateSource, JobSource, ListingCategory, SortOrder } from '@/types'

// z.union is used instead of z.discriminatedUnion because the discriminant field
// holds z.enum() (multiple values per variant), not z.literal() as discriminatedUnion requires.
export const WorkerScrapePayloadSchema = z.union([
  z.object({
    source:   z.enum(Object.values(RealEstateSource) as [string, ...string[]]),
    category: z.enum(['sale', 'rent_long', 'rent_short']),
    page:     z.number().int().positive().optional().default(1),
  }),
  z.object({
    source:   z.enum(Object.values(JobSource) as [string, ...string[]]),
    category: z.literal('jobs'),
    page:     z.number().int().positive().optional().default(1),
  }),
])

export type WorkerScrapePayloadParsed = z.infer<typeof WorkerScrapePayloadSchema>

// WorkerScorePayloadSchema is defined inline in src/app/api/worker/score/route.ts
// with the full constraints (ids min(1).max(50), criteriaOverride optional).
// Do not duplicate it here — divergent schemas are a maintenance trap.

// ─── Search API ───────────────────────────────────────────────────────────────

export const SearchParamsSchema = z.object({
  q:              z.string().max(500).optional(),
  type:           z.enum(['listing', 'job']).default('listing'),
  category:       z.enum(Object.values(ListingCategory) as [string, ...string[]]).optional(),
  priceMin:       z.coerce.number().finite().optional(),
  priceMax:       z.coerce.number().finite().optional(),
  areaMin:        z.coerce.number().finite().optional(),
  areaMax:        z.coerce.number().finite().optional(),
  rooms:          z.string().regex(/^\d+(,\d+)*$/).optional(),
  location:       z.string().max(200).optional(),
  source:         z.string().optional(),
  salaryMin:      z.coerce.number().finite().optional(),
  salaryMax:      z.coerce.number().finite().optional(),
  employmentType: z.string().optional(),
  techStack:      z.string().optional(),
  remote:         z.coerce.number().int().min(0).max(1).transform(v => v === 1).optional(),
  scoreMin:       z.coerce.number().finite().min(0).max(100).optional(),
  sort:           z.enum(Object.values(SortOrder) as [string, ...string[]]).optional(),
  page:           z.coerce.number().int().positive().max(1000).default(1),
  pageSize:       z.coerce.number().int().positive().max(100).default(50),
  semantic:       z.enum(['0', '1']).default('0'),
})

export type SearchParamsParsed = z.infer<typeof SearchParamsSchema>

// ─── Score API ────────────────────────────────────────────────────────────────

export const ScoreRequestSchema = z.object({
  type:     z.enum(['listing', 'job']),
  id:       z.string().uuid().optional(),
  criteria: z.string().min(1).max(500),
  preview:  z.boolean().optional(),
}).refine(
  (data) => data.preview === true || data.id !== undefined,
  { message: 'Either preview must be true or id must be provided', path: ['id'] }
)

export type ScoreRequestParsed = z.infer<typeof ScoreRequestSchema>

// ─── Snapshots API ────────────────────────────────────────────────────────────

export const SnapshotsQuerySchema = z.object({
  refId:   z.string().uuid(),
  refType: z.enum(['listing', 'job']),
})

export type SnapshotsQueryParsed = z.infer<typeof SnapshotsQuerySchema>

// ─── Watches API ──────────────────────────────────────────────────────────────

const ListingFiltersSchema = z.object({
  q:        z.string().max(500).optional(),
  category: z.enum(['sale', 'rent_long', 'rent_short']).optional(),
  priceMin: z.number().finite().optional(),
  priceMax: z.number().finite().optional(),
  areaMin:  z.number().finite().optional(),
  areaMax:  z.number().finite().optional(),
  rooms:    z.array(z.number().int().positive()).optional(),
  location: z.string().max(200).optional(),
  source:   z.array(z.string()).optional(),
  scoreMin: z.number().finite().min(0).max(100).optional(),
})

const JobFiltersSchema = z.object({
  q:              z.string().max(500).optional(),
  location:       z.string().max(200).optional(),
  remote:         z.boolean().optional(),
  salaryMin:      z.number().finite().optional(),
  salaryMax:      z.number().finite().optional(),
  employmentType: z.array(z.string()).optional(),
  techStack:      z.array(z.string()).optional(),
  source:         z.array(z.string()).optional(),
  scoreMin:       z.number().finite().min(0).max(100).optional(),
})

export const WatchCreateSchema = z.object({
  type:          z.enum(['listing', 'job']),
  filters:       z.union([ListingFiltersSchema, JobFiltersSchema]).default({}),
  criteria:      z.string().min(1).max(1000).optional(),
  minScore:      z.number().int().min(0).max(100).optional().default(70),
  notifyEmail:   z.string().email().optional(),
  notifyWebhook: z.string().url().optional(),
})

export type WatchCreateParsed = z.infer<typeof WatchCreateSchema>

export const WatchUpdateSchema = z.object({
  filters:       z.union([ListingFiltersSchema, JobFiltersSchema]).optional(),
  criteria:      z.string().min(1).max(1000).optional(),
  minScore:      z.number().int().min(0).max(100).optional(),
  notifyEmail:   z.string().email().optional().nullable(),
  notifyWebhook: z.string().url().optional().nullable(),
  active:        z.boolean().optional(),
})

export type WatchUpdateParsed = z.infer<typeof WatchUpdateSchema>
