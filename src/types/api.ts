import type { ListingFilters, JobFilters } from './filters'
import type { ListingSummary, JobSummary } from './domain'
import type { RealEstateSource, JobSource, ListingCategory, WatchType, RefType } from './enums'

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchRequest {
  type:    'listing' | 'job'
  filters: ListingFilters | JobFilters
}

export interface PaginatedResponse<T> {
  data:     T[]
  total:    number
  page:     number
  pageSize: number
  pages:    number
}

export type SearchListingsResponse = PaginatedResponse<ListingSummary>
export type SearchJobsResponse     = PaginatedResponse<JobSummary>

// ─── Score ────────────────────────────────────────────────────────────────────

export interface ScoreRequest {
  type:      'listing' | 'job'
  id?:       string     // optional in preview mode
  criteria:  string
  preview?:  boolean
}

export interface ScoreResponse {
  id?:       string
  score:     number
  reasoning: string
}

// ─── Scrape Dispatch ──────────────────────────────────────────────────────────

export interface ScrapeDispatchResponse {
  queued: Array<{ source: string; category: string }>
  count:  number
}

// WorkerScrapePayload: discriminated union prevents typos at compile time
export type WorkerScrapePayload =
  | { source: RealEstateSource; category: ListingCategory; page?: number }
  | { source: JobSource;        category: 'jobs';          page?: number }

export interface WorkerScrapeResponse {
  source:     string
  category:   string
  scraped:    number
  new:        number
  updated:    number
  skipped:    number
  notified:   number
  durationMs: number
}

// ─── Worker Score ─────────────────────────────────────────────────────────────

export interface WorkerScorePayload {
  ids:  string[]
  type: 'listing' | 'job'
}

export interface WorkerScoreResponse {
  scored:  number
  skipped: number
  failed:  number
}

// ─── Notify ───────────────────────────────────────────────────────────────────

export interface NotifyRequest {
  refId:   string
  refType: RefType
}

export interface NotifyResponse {
  refId:          string
  refType:        RefType
  watchesChecked: number
  notified:       number
}

// ─── Watches API ──────────────────────────────────────────────────────────────

export interface WatchesListResponse {
  data:  import('./domain').Watch[]
  total: number
}

// ─── Error ────────────────────────────────────────────────────────────────────

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'

export interface ApiError {
  error: {
    code:     ApiErrorCode
    message:  string
    details?: Record<string, unknown>
  }
}
