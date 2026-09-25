import { inArray } from 'drizzle-orm'
import { db } from '@/db'
import { listings, jobs } from '@/db/schema'
import { dedupListing, dedupJob } from './dedup'
import { computeListingDiff, computeJobDiff, saveDiffSnapshot } from './diff'
import { generateEmbeddingBatch, buildListingEmbeddingText, buildJobEmbeddingText } from '@/ai/embeddings'
import { AITask } from '@/ai/client'
import { upsertListing } from '@/db/queries/listings'
import { upsertJob } from '@/db/queries/jobs'
import type { ScrapedListing, ScrapedJob } from '@/types'
import type { PipelineResult, DedupResult } from '@/types'

// ─── Listings ─────────────────────────────────────────────────────────────────

export async function runListingPipeline(items: ScrapedListing[]): Promise<PipelineResult> {
  const result: PipelineResult = { inserted: 0, updated: 0, skipped: 0, ids: [] }
  if (items.length === 0) return result

  const dedupResults: DedupResult[] = await Promise.all(items.map(dedupListing))

  // Build toProcess array — zip items with their dedup results
  const toProcess: Array<{ item: ScrapedListing; dedup: DedupResult }> = []
  for (const [i, item] of items.entries()) {
    const dr = dedupResults[i]
    if (!dr) continue
    if (dr.status === 'unchanged') {
      result.skipped++
    } else {
      toProcess.push({ item, dedup: dr })
    }
  }

  if (toProcess.length === 0) return result

  const embedTexts = toProcess.map(({ item }) => buildListingEmbeddingText(item))
  // Each entry is number[] on success or undefined on per-item failure
  const embeddings: (number[] | undefined)[] = await batchEmbedWithFallback(embedTexts, AITask.EMBED_LISTING)

  // Load existing rows for changed items in one batch query
  const changedIds = toProcess
    .filter((p) => p.dedup.status === 'changed' && p.dedup.existingId)
    .map((p) => p.dedup.existingId!)

  const existingMap = new Map<string, typeof listings.$inferSelect>()
  if (changedIds.length > 0) {
    const rows = await db.select().from(listings).where(inArray(listings.id, changedIds))
    for (const row of rows) existingMap.set(row.id, row)
  }

  for (const [i, entry] of toProcess.entries()) {
    const { item, dedup } = entry
    const embedding = embeddings[i]

    if (!embedding) {
      result.skipped++
      continue
    }

    try {
      if (dedup.status === 'changed' && dedup.existingId) {
        const existing = existingMap.get(dedup.existingId)
        if (existing) {
          const diff = computeListingDiff(existing, item)
          await saveDiffSnapshot(dedup.existingId, 'listing', diff)
        }
      }

      const upserted = await upsertListing({
        category:     item.category,
        source:       item.source,
        url:          item.url,
        title:        item.title,
        price:        item.price != null ? String(item.price) : null,
        currency:     item.priceCurrency,
        area_m2:      item.areaM2 != null ? String(item.areaM2) : null,
        rooms:        item.rooms,
        location:     item.location,
        lat:          item.lat != null ? String(item.lat) : null,
        lng:          item.lng != null ? String(item.lng) : null,
        description:  item.description,
        images:       item.images,
        embedding,
        content_hash: item.contentHash,
        score_status: 'pending',
        scraped_at:   item.scrapedAt,
      })

      if (upserted) {
        result.ids.push(upserted.id)
        if (dedup.status === 'new')     result.inserted++
        if (dedup.status === 'changed') result.updated++
      }
    } catch (err) {
      console.error('[pipeline] Listing upsert failed', { url: item.url, err })
    }
  }

  return result
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function runJobPipeline(items: ScrapedJob[]): Promise<PipelineResult> {
  const result: PipelineResult = { inserted: 0, updated: 0, skipped: 0, ids: [] }
  if (items.length === 0) return result

  const dedupResults: DedupResult[] = await Promise.all(items.map(dedupJob))

  const toProcess: Array<{ item: ScrapedJob; dedup: DedupResult }> = []
  for (const [i, item] of items.entries()) {
    const dr = dedupResults[i]
    if (!dr) continue
    if (dr.status === 'unchanged') {
      result.skipped++
    } else {
      toProcess.push({ item, dedup: dr })
    }
  }

  if (toProcess.length === 0) return result

  const embedTexts = toProcess.map(({ item }) => buildJobEmbeddingText(item))
  const embeddings: (number[] | undefined)[] = await batchEmbedWithFallback(embedTexts, AITask.EMBED_JOB)

  const changedIds = toProcess
    .filter((p) => p.dedup.status === 'changed' && p.dedup.existingId)
    .map((p) => p.dedup.existingId!)

  const existingMap = new Map<string, typeof jobs.$inferSelect>()
  if (changedIds.length > 0) {
    const rows = await db.select().from(jobs).where(inArray(jobs.id, changedIds))
    for (const row of rows) existingMap.set(row.id, row)
  }

  for (const [i, entry] of toProcess.entries()) {
    const { item, dedup } = entry
    const embedding = embeddings[i]

    if (!embedding) {
      result.skipped++
      continue
    }

    try {
      if (dedup.status === 'changed' && dedup.existingId) {
        const existing = existingMap.get(dedup.existingId)
        if (existing) {
          const diff = computeJobDiff(existing, item)
          await saveDiffSnapshot(dedup.existingId, 'job', diff)
        }
      }

      const upserted = await upsertJob({
        source:          item.source,
        url:             item.url,
        title:           item.title,
        company:         item.company,
        location:        item.location,
        remote:          item.remote,
        salary_min:      item.salaryMin != null ? String(item.salaryMin) : null,
        salary_max:      item.salaryMax != null ? String(item.salaryMax) : null,
        currency:        item.currency,
        employment_type: item.employmentType,
        tech_stack:      item.techStack,
        description:     item.description,
        embedding,
        content_hash:    item.contentHash,
        score_status:    'pending',
        scraped_at:      item.scrapedAt,
      })

      if (upserted) {
        result.ids.push(upserted.id)
        if (dedup.status === 'new')     result.inserted++
        if (dedup.status === 'changed') result.updated++
      }
    } catch (err) {
      console.error('[pipeline] Job upsert failed', { url: item.url, err })
    }
  }

  return result
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

async function batchEmbedWithFallback(
  texts: string[],
  task:  AITask
): Promise<(number[] | undefined)[]> {
  try {
    return await generateEmbeddingBatch(texts, task)
  } catch (err) {
    console.error('[pipeline] Batch embedding failed, falling back to per-item', err)
    return Promise.all(
      texts.map(async (text) => {
        try {
          const [embedding] = await generateEmbeddingBatch([text], task)
          return embedding
        } catch (itemErr) {
          console.error('[pipeline] Per-item embedding failed, skipping', { err: itemErr })
          return undefined
        }
      })
    )
  }
}
