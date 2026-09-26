import { z } from 'zod'

export const WatchFormSchema = z.object({
  type: z.enum(['listing', 'job'], {
    required_error: 'Select a watch type',
  }),
  criteria: z
    .string()
    .max(500, 'Criteria must be 500 characters or less')
    .optional(),
  minScore: z
    .number({ invalid_type_error: 'Enter a number 0–100' })
    .min(0)
    .max(100)
    .default(0),
  notifyEmail: z
    .string()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),
  notifyWebhook: z
    .string()
    .url('Enter a valid URL')
    .optional()
    .or(z.literal('')),
  // Filters are stored as a JSON blob — actual type safety comes from FilterBar state,
  // not from Zod. ListingFilters / JobFilters are enforced by the embedded FilterBar.
  filters: z.record(z.unknown()).optional(),
})

export type WatchFormValues = z.infer<typeof WatchFormSchema>
