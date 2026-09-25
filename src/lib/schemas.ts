import { z } from 'zod'
import { RealEstateSource, JobSource } from '@/types'

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
