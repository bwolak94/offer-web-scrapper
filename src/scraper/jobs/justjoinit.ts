import JSONStream from 'JSONStream'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { Writable } from 'stream'
import { z } from 'zod'
import { computeContentHash } from '@/pipeline/dedup'
import type { ScrapedJob, ScraperResult, ScraperError } from '@/types'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const JustJoinOfferSchema = z.object({
  title:       z.string(),
  companyName: z.string().nullable(),
  city:        z.string().nullable(),
  remoteInterview: z.boolean().default(false),
  workplaceType:   z.string().nullable(),
  employmentTypes: z.array(z.object({
    type: z.string(),
    salary: z.object({
      from:     z.number().nullable(),
      to:       z.number().nullable(),
      currency: z.string(),
    }).nullable(),
  })).default([]),
  requiredSkills: z.array(z.object({ name: z.string() })).default([]),
  offerUrl:    z.string().optional(),
  id:          z.string().optional(),
}).passthrough()

// ─── Transform ────────────────────────────────────────────────────────────────

function transformJustJoinOffer(offer: z.infer<typeof JustJoinOfferSchema>): ScrapedJob {
  const remote = offer.workplaceType === 'remote' || offer.remoteInterview

  const firstEmployment = offer.employmentTypes[0] ?? null
  const salary          = firstEmployment?.salary ?? null

  const slug = offer.id
    ?? offer.title.toLowerCase().replace(/\s+/g, '-')
  const url = `https://justjoin.it/offers/${slug}`

  const partial: Omit<ScrapedJob, 'contentHash'> = {
    source:         'justjoinit',
    url,
    title:          offer.title,
    company:        offer.companyName ?? null,
    location:       offer.city ?? null,
    remote,
    salaryMin:      salary?.from ?? null,
    salaryMax:      salary?.to ?? null,
    currency:       salary?.currency ?? 'PLN',
    employmentType: null,
    techStack:      offer.requiredSkills.map((s) => s.name),
    description:    null,
    postedAt:       null,
    scrapedAt:      new Date(),
  }

  return {
    ...partial,
    contentHash: computeContentHash(partial as ScrapedJob),
  }
}

// ─── Main scrape function ─────────────────────────────────────────────────────

export async function scrapeJustJoinIt(
  category: string,
  page: number,
): Promise<ScraperResult<ScrapedJob>> {
  const startMs = Date.now()
  const errors: ScraperError[] = []

  // JustJoin.it provides a full dump — only process page 1
  if (page !== 1) {
    return {
      source:     'justjoinit',
      category:   'jobs',
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [],
    }
  }

  let response: Response
  try {
    response = await fetch('https://justjoin.it/api/offers', {
      signal: AbortSignal.timeout(120_000),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':   'Mozilla/5.0 (compatible; OtWebScraper/1.0)',
      },
    })

    if (!response.ok) {
      throw new Error(`JustJoin.it returned ${response.status}`)
    }
  } catch (err) {
    return {
      source:     'justjoinit',
      category:   'jobs',
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: String(err), code: 'NETWORK_ERROR' }],
    }
  }

  const items: ScrapedJob[] = []

  try {
    const parser = JSONStream.parse('*')
    parser.on('data', (offer: unknown) => {
      const parsed = JustJoinOfferSchema.safeParse(offer)
      if (parsed.success) {
        try {
          items.push(transformJustJoinOffer(parsed.data))
        } catch {
          // skip malformed
        }
      }
    })

    const nodeStream = Readable.fromWeb(
      response.body as Parameters<typeof Readable.fromWeb>[0],
    )
    await pipeline(nodeStream, parser, new Writable({ write(_, __, cb) { cb() } }))
  } catch (err) {
    errors.push({ message: String(err), code: 'PARSE_ERROR' })
  }

  return {
    source:     'justjoinit',
    category:   'jobs',
    items,
    page,
    hasMore:    false,
    durationMs: Date.now() - startMs,
    errors,
  }
}
