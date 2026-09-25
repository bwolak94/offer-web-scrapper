import { createHash } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { listings, jobs } from '@/db/schema'
import type { ScrapedListing, ScrapedJob } from '@/types'
import type { DedupResult } from '@/types'

export function computeContentHash(item: ScrapedListing | ScrapedJob): string {
  const parts = [
    item.url,
    item.title,
    item.description?.slice(0, 200) ?? '',
    'price' in item ? String(item.price ?? '') : '',
    'areaM2' in item ? String((item as ScrapedListing).areaM2 ?? '') : '',
    'rooms' in item ? String((item as ScrapedListing).rooms ?? '') : '',
    'salaryMin' in item ? String((item as ScrapedJob).salaryMin ?? '') : '',
    'salaryMax' in item ? String((item as ScrapedJob).salaryMax ?? '') : '',
  ]
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex')
}

export async function dedupListing(item: ScrapedListing): Promise<DedupResult> {
  const [existing] = await db
    .select({ id: listings.id, content_hash: listings.content_hash })
    .from(listings)
    .where(eq(listings.url, item.url))
    .limit(1)

  if (!existing) return { status: 'new' }
  if (existing.content_hash === item.contentHash) return { status: 'unchanged', existingId: existing.id }
  return { status: 'changed', existingId: existing.id }
}

export async function dedupJob(item: ScrapedJob): Promise<DedupResult> {
  const [existing] = await db
    .select({ id: jobs.id, content_hash: jobs.content_hash })
    .from(jobs)
    .where(eq(jobs.url, item.url))
    .limit(1)

  if (!existing) return { status: 'new' }
  if (existing.content_hash === item.contentHash) return { status: 'unchanged', existingId: existing.id }
  return { status: 'changed', existingId: existing.id }
}
