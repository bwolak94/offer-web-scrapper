import type { SnapshotDiff } from './domain'

export interface DedupResult {
  status:      'new' | 'changed' | 'unchanged'
  existingId?: string
  diff?:       SnapshotDiff
}

export interface PipelineResult {
  inserted: number
  updated:  number
  skipped:  number
  ids:      string[]  // IDs of inserted/updated rows, used to enqueue scoring
}
