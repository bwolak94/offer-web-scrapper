import type {
  ListingCategory,
  RealEstateSource,
  JobSource,
  EmploymentType,
  WatchType,
  RefType,
  ScoreStatus,
} from './enums'
import type { ListingFilters, JobFilters } from './filters'

// ─── Listing ──────────────────────────────────────────────────────────────────
// Uses camelCase and number types — NOT the Drizzle DbListing shape (snake_case, string numerics).

export interface Listing {
  id:          string
  category:    ListingCategory
  source:      RealEstateSource
  url:         string
  title:       string
  price:       number | null
  currency:    string
  areaM2:      number | null
  rooms:       number | null
  location:    string | null
  lat:         number | null
  lng:         number | null
  description: string | null
  images:      string[]
  aiScore:     number | null
  scoreStatus: ScoreStatus
  scoredAt:    Date | null
  // embedding is never sent to browser — use ListingPublic for all API responses
  embedding:   number[] | null
  contentHash: string
  scrapedAt:   Date
  updatedAt:   Date
}

// ListingPublic: embedding excluded — use for ALL API responses and page props
export type ListingPublic = Omit<Listing, 'embedding'>

// ListingSummary: minimal shape for list views (no description)
export interface ListingSummary {
  id:          string
  category:    ListingCategory
  source:      RealEstateSource
  url:         string
  title:       string
  price:       number | null
  currency:    string
  areaM2:      number | null
  rooms:       number | null
  location:    string | null
  lat:         number | null
  lng:         number | null
  images:      string[]
  aiScore:     number | null
  scoreStatus: ScoreStatus
  scrapedAt:   Date
  updatedAt:   Date
}

// ─── Job ──────────────────────────────────────────────────────────────────────

export interface Job {
  id:             string
  source:         JobSource
  url:            string
  title:          string
  company:        string | null
  location:       string | null
  salaryMin:      number | null
  salaryMax:      number | null
  currency:       string
  employmentType: EmploymentType | null
  techStack:      string[]
  remote:         boolean | null
  description:    string | null
  aiScore:        number | null
  scoreStatus:    ScoreStatus
  scoredAt:       Date | null
  // embedding is never sent to browser — use JobPublic for all API responses
  embedding:      number[] | null
  contentHash:    string
  scrapedAt:      Date
  updatedAt:      Date
}

// JobPublic: embedding excluded — use for ALL API responses and page props
export type JobPublic = Omit<Job, 'embedding'>

// JobSummary: minimal shape for list views
export interface JobSummary {
  id:             string
  source:         JobSource
  url:            string
  title:          string
  company:        string | null
  location:       string | null
  salaryMin:      number | null
  salaryMax:      number | null
  currency:       string
  employmentType: EmploymentType | null
  techStack:      string[]
  remote:         boolean | null
  aiScore:        number | null
  scoreStatus:    ScoreStatus
  scrapedAt:      Date
  updatedAt:      Date
}

// ─── Watch ────────────────────────────────────────────────────────────────────

export interface Watch {
  id:               string
  type:             WatchType
  filters:          ListingFilters | JobFilters
  criteria:         string | null
  criteriaEmbedding: number[] | null
  minScore:         number
  notifyEmail:      string | null
  notifyWebhook:    string | null
  active:           boolean
  createdAt:        Date
  updatedAt:        Date
}

export interface CreateWatchInput {
  type:            WatchType
  filters:         ListingFilters | JobFilters
  criteria?:       string
  minScore?:       number
  notifyEmail?:    string
  notifyWebhook?:  string
}

export type UpdateWatchInput = Partial<Omit<CreateWatchInput, 'type'>>

// ─── Snapshot ─────────────────────────────────────────────────────────────────

export interface SnapshotDiff {
  fields: Array<{
    field:    string
    oldValue: unknown
    newValue: unknown
  }>
}

export interface Snapshot {
  id:        string
  refId:     string
  refType:   RefType
  diff:      SnapshotDiff
  snappedAt: Date
}

// ─── MapViewItem ──────────────────────────────────────────────────────────────
// Shared between MapViewWrapper and MapView — avoids duplicating the inline type.

export interface MapViewItem {
  id:    string
  lat:   number
  lng:   number
  title: string
  price: number | null
}

// ─── ScoringContext ───────────────────────────────────────────────────────────
// Narrow type — only fields the scorer actually reads.
// criteria is a separate scorer function parameter, NOT a field here.
// (FULLSTACK-REVIEW ISSUE-W1)

export interface ScoringContext {
  id:              string
  type:            'listing' | 'job'
  title:           string
  price?:          number | null      // listings only
  pricePerM2?:     number | null      // listings only (computed, not stored)
  areaM2?:         number | null      // listings only
  rooms?:          number | null      // listings only
  location:        string | null
  salaryMin?:      number | null      // jobs only
  salaryMax?:      number | null      // jobs only
  currency?:       string             // listings + jobs (used in price/salary formatting)
  techStack?:      string[]           // jobs only
  remote?:         boolean | null     // jobs only
  employmentType?: string | null      // jobs only
  description:     string | null
}

// ─── ScoreCache ───────────────────────────────────────────────────────────────

export interface ScoreCacheEntry {
  id:           string
  refId:        string
  refType:      RefType
  criteriaHash: string
  model:        string
  score:        number
  reason:       string | null
  createdAt:    Date
}

// ─── NotificationLog ──────────────────────────────────────────────────────────

export interface NotificationLog {
  id:       string
  watchId:  string
  refId:    string
  refType:  RefType
  channel:  'email' | 'webhook'
  sentAt:   Date
}
