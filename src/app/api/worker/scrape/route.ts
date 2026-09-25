import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { Client as QStashClient } from '@upstash/qstash'
import { WorkerScrapePayloadSchema } from '@/lib/schemas'
import { env } from '@/lib/env'
import { runListingPipeline, runJobPipeline } from '@/pipeline'
import { getScraper } from '@/scraper'
import type { ScrapedListing, ScrapedJob } from '@/types'

export const maxDuration = 300

async function handler(request: Request): Promise<Response> {
  // Read raw body for JSON parsing.
  // verifySignatureAppRouter has already verified the HMAC signature before invoking this handler.
  const rawBody = await request.text()
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const parsed = WorkerScrapePayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() } },
      { status: 400 }
    )
  }

  const { source, category, page = 1 } = parsed.data

  const scraper = getScraper(source)
  if (!scraper) {
    return Response.json(
      { error: { code: 'UNPROCESSABLE', message: `No scraper registered for source: ${source}` } },
      { status: 422 }
    )
  }

  try {
    const startMs = Date.now()
    const scraperResult = await scraper.scrape(category, page)

    let pipelineResult
    if (category === 'jobs') {
      pipelineResult = await runJobPipeline(scraperResult.items as ScrapedJob[])
    } else {
      pipelineResult = await runListingPipeline(scraperResult.items as ScrapedListing[])
    }

    // Instantiate one client and reuse for both potential publishes
    const qstash     = new QStashClient({ token: env.QSTASH_TOKEN })
    const workerBase = env.NEXT_PUBLIC_APP_URL

    // Enqueue scoring for inserted/updated items
    if (pipelineResult.ids.length > 0) {
      await qstash.publishJSON({
        url:     `${workerBase}/api/worker/score`,
        body:    { ids: pipelineResult.ids, type: category === 'jobs' ? 'job' : 'listing' },
        retries: 3,
      })
    }

    // Paginate if scraper reports more pages (MAX_PAGES=10 guard prevents runaway pagination)
    if (scraperResult.hasMore && page < 10) {
      await qstash.publishJSON({
        url:     `${workerBase}/api/worker/scrape`,
        body:    { source, category, page: page + 1 },
        retries: 3,
      })
    }

    return Response.json({
      source,
      category,
      scraped:    scraperResult.items.length,
      new:        pipelineResult.inserted,
      updated:    pipelineResult.updated,
      skipped:    pipelineResult.skipped,
      notified:   0,
      durationMs: Date.now() - startMs,
    })
  } catch (err) {
    console.error('[worker/scrape] Unexpected error', { source, category, page, err })
    return Response.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}

// Defer verifySignatureAppRouter(handler) to request time so the QStash SDK does not
// read QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY at module evaluation
// (which runs during `next build` when env vars are not yet available).
export function POST(request: Request): Promise<Response> {
  return verifySignatureAppRouter(handler)(request)
}
