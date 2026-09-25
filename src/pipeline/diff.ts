import { recordSnapshot } from '@/db/queries/snapshots'
import type { ScrapedListing, ScrapedJob } from '@/types'
import type { SnapshotDiff } from '@/types'

type DbListingRow = {
  price:       string | null
  area_m2:     string | null
  rooms:       number | null
  title:       string
  description: string | null
}

type DbJobRow = {
  title:           string
  company:         string | null
  salary_min:      string | null
  salary_max:      string | null
  employment_type: string | null
  description:     string | null
}

export function computeListingDiff(existing: DbListingRow, incoming: ScrapedListing): SnapshotDiff {
  const fields: SnapshotDiff['fields'] = []

  const oldPrice = existing.price != null ? parseFloat(existing.price) : null
  if (oldPrice !== incoming.price) {
    fields.push({ field: 'price', oldValue: oldPrice, newValue: incoming.price })
  }

  const oldArea = existing.area_m2 != null ? parseFloat(existing.area_m2) : null
  if (oldArea !== incoming.areaM2) {
    fields.push({ field: 'area_m2', oldValue: oldArea, newValue: incoming.areaM2 })
  }

  if (existing.rooms !== incoming.rooms) {
    fields.push({ field: 'rooms', oldValue: existing.rooms, newValue: incoming.rooms })
  }

  if (existing.title !== incoming.title) {
    fields.push({ field: 'title', oldValue: existing.title, newValue: incoming.title })
  }

  const oldDesc = existing.description?.slice(0, 200) ?? null
  const newDesc = incoming.description?.slice(0, 200) ?? null
  if (oldDesc !== newDesc) {
    fields.push({ field: 'description', oldValue: existing.description, newValue: incoming.description })
  }

  return { fields }
}

export function computeJobDiff(existing: DbJobRow, incoming: ScrapedJob): SnapshotDiff {
  const fields: SnapshotDiff['fields'] = []

  if (existing.title !== incoming.title) {
    fields.push({ field: 'title', oldValue: existing.title, newValue: incoming.title })
  }

  if (existing.company !== incoming.company) {
    fields.push({ field: 'company', oldValue: existing.company, newValue: incoming.company })
  }

  const oldSalMin = existing.salary_min != null ? parseFloat(existing.salary_min) : null
  if (oldSalMin !== incoming.salaryMin) {
    fields.push({ field: 'salary_min', oldValue: oldSalMin, newValue: incoming.salaryMin })
  }

  const oldSalMax = existing.salary_max != null ? parseFloat(existing.salary_max) : null
  if (oldSalMax !== incoming.salaryMax) {
    fields.push({ field: 'salary_max', oldValue: oldSalMax, newValue: incoming.salaryMax })
  }

  if (existing.employment_type !== (incoming.employmentType ?? null)) {
    fields.push({ field: 'employment_type', oldValue: existing.employment_type, newValue: incoming.employmentType })
  }

  const oldDesc = existing.description?.slice(0, 200) ?? null
  const newDesc = incoming.description?.slice(0, 200) ?? null
  if (oldDesc !== newDesc) {
    fields.push({ field: 'description', oldValue: existing.description, newValue: incoming.description })
  }

  return { fields }
}

export async function saveDiffSnapshot(
  existingId: string,
  refType:    'listing' | 'job',
  diff:       SnapshotDiff
): Promise<void> {
  if (diff.fields.length === 0) return
  const diffPayload = Object.fromEntries(
    diff.fields.map((f) => [f.field, { from: f.oldValue, to: f.newValue }])
  )
  await recordSnapshot(existingId, refType, diffPayload)
}
