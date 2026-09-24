import type { ListingSummary, JobSummary, Watch } from './domain'
import type { WatchType } from './enums'

export interface EmailNotificationPayload {
  to:      string
  subject: string
  items:   Array<ListingSummary | JobSummary>
  watch:   Watch
}

export interface WebhookNotificationPayload {
  watchId: string
  type:    WatchType
  items:   Array<ListingSummary | JobSummary>
  sentAt:  string  // ISO 8601
}
