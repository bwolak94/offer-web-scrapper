import type { ScrapedListing, ScrapedJob } from '@/types/scraper'
import { resolveModel, validateEmbeddingDimensions, AITask } from './client'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DESCRIPTION_TRUNCATE = 800
const BATCH_SIZE            = 20
const HF_TIMEOUT_MS         = 30_000
const RETRY_DELAY_MS        = 20_000

// ---------------------------------------------------------------------------
// Text builders — pure functions, no I/O
// ---------------------------------------------------------------------------

export function buildListingEmbeddingText(listing: ScrapedListing): string {
  const parts: string[] = []

  parts.push(listing.title)

  if (listing.location) parts.push(listing.location)

  if (listing.price != null) {
    const priceStr =
      listing.pricePerM2 != null
        ? `Cena: ${listing.price} PLN (${Math.round(listing.pricePerM2)} PLN/m2)`
        : `Cena: ${listing.price} PLN`
    parts.push(priceStr)
  }

  if (listing.areaM2 != null) parts.push(`Powierzchnia: ${listing.areaM2} m2`)
  if (listing.rooms  != null) parts.push(`Pokoje: ${listing.rooms}`)

  if (listing.description) {
    parts.push(listing.description.slice(0, DESCRIPTION_TRUNCATE))
  }

  return parts.join('. ')
}

export function buildJobEmbeddingText(job: ScrapedJob): string {
  const parts: string[] = []

  parts.push(job.title)

  if (job.company)  parts.push(job.company)
  if (job.location) parts.push(job.location)

  if (job.remote === true)  parts.push('praca zdalna')
  if (job.remote === false) parts.push('praca stacjonarna')

  if (job.salaryMin != null) {
    const salStr =
      job.salaryMax != null
        ? `Wynagrodzenie: ${job.salaryMin}–${job.salaryMax} ${job.currency}/mies`
        : `Wynagrodzenie od: ${job.salaryMin} ${job.currency}/mies`
    parts.push(salStr)
  }

  if (job.techStack.length > 0) {
    parts.push(`Technologie: ${job.techStack.join(', ')}`)
  }

  if (job.description) {
    parts.push(job.description.slice(0, DESCRIPTION_TRUNCATE))
  }

  return parts.join('. ')
}

export function buildQueryEmbeddingText(query: string): string {
  return query.trim().slice(0, DESCRIPTION_TRUNCATE)
}

// ---------------------------------------------------------------------------
// Internal: call HuggingFace feature-extraction pipeline
// Handles 503 "Model is currently loading" cold-start with one retry.
// ---------------------------------------------------------------------------

async function callHuggingFaceEmbed(
  url:    string,
  auth:   string,
  inputs: string | string[]
): Promise<number[] | number[][]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HF_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        Authorization:  auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs }),
    })
  } finally {
    clearTimeout(timer)
  }

  // Free-tier cold start: model not yet loaded
  if (res.status === 503) {
    const body = (await res.json()) as { error?: string; estimated_time?: number }
    if (body.error?.includes('loading')) {
      const waitMs = Math.min(
        (body.estimated_time ?? 20) * 1000,
        RETRY_DELAY_MS
      )
      await new Promise((r) => setTimeout(r, waitMs))

      const retryController = new AbortController()
      const retryTimer = setTimeout(() => retryController.abort(), HF_TIMEOUT_MS)
      let retry: Response
      try {
        retry = await fetch(url, {
          method:  'POST',
          signal:  retryController.signal,
          headers: {
            Authorization:  auth,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs }),
        })
      } finally {
        clearTimeout(retryTimer)
      }

      if (!retry.ok) {
        const errBody = await retry.text()
        throw new Error(
          `[embeddings] HuggingFace retry failed (${retry.status}): ${errBody}`
        )
      }

      return retry.json() as Promise<number[] | number[][]>
    }
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `[embeddings] HuggingFace embed failed (${res.status}): ${body}`
    )
  }

  return res.json() as Promise<number[] | number[][]>
}

// ---------------------------------------------------------------------------
// generateEmbedding — single text
// ---------------------------------------------------------------------------

export async function generateEmbedding(
  text: string,
  task: AITask = AITask.EMBED_LISTING
): Promise<number[]> {
  const { hfEmbedUrl, hfAuthHeader, config } = resolveModel(task)

  if (!hfEmbedUrl || !hfAuthHeader) {
    throw new Error(
      `[embeddings] resolveModel returned no HuggingFace config for task ${task}`
    )
  }

  const result = await callHuggingFaceEmbed(hfEmbedUrl, hfAuthHeader, text)

  if (!Array.isArray(result) || result.length === 0) {
    throw new Error('[embeddings] HuggingFace returned unexpected shape for single input')
  }
  if (!result.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    throw new Error('[embeddings] HuggingFace returned non-finite values in embedding')
  }

  const embedding = result as number[]
  validateEmbeddingDimensions(embedding, config.model)
  return embedding
}

// ---------------------------------------------------------------------------
// generateEmbeddingBatch — multiple texts, up to BATCH_SIZE per HTTP call
// ---------------------------------------------------------------------------

export async function generateEmbeddingBatch(
  texts: string[],
  task:  AITask = AITask.EMBED_LISTING
): Promise<number[][]> {
  if (texts.length === 0) return []

  const { hfEmbedUrl, hfAuthHeader, config } = resolveModel(task)

  if (!hfEmbedUrl || !hfAuthHeader) {
    throw new Error(
      `[embeddings] resolveModel returned no HuggingFace config for task ${task}`
    )
  }

  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const raw   = await callHuggingFaceEmbed(hfEmbedUrl, hfAuthHeader, batch)
    const embeddings = raw as number[][]

    if (!Array.isArray(embeddings) || embeddings.length !== batch.length) {
      throw new Error(
        `[embeddings] Batch size mismatch: sent ${batch.length}, received ${(embeddings as unknown[])?.length ?? 0}`
      )
    }

    for (const emb of embeddings) {
      validateEmbeddingDimensions(emb, config.model)
    }

    results.push(...embeddings)
  }

  return results
}
