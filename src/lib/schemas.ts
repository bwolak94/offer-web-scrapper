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

export const WorkerScorePayloadSchema = z.object({
  ids:  z.array(z.string().uuid()),
  type: z.enum(['listing', 'job']),
})
