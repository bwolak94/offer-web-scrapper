import { z } from 'zod'
import { computeContentHash } from '@/pipeline/dedup'
import type { ScrapedListing, ScraperResult, ScraperError } from '@/types'
import type { ListingCategory } from '@/types'

// ─── Category IDs ─────────────────────────────────────────────────────────────

const CATEGORY_IDS: Record<string, number> = {
  sale:       1145,
  rent_long:  15,
  rent_short: 1701,
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const OlxOfferSchema = z.object({
  id:    z.number().transform(String),
  url:   z.string().url(),
  title: z.string(),
  params: z.array(z.object({
    key:   z.string(),
    value: z.object({
      label: z.string().optional(),
      key:   z.string().optional(),
      value: z.unknown().optional(),
    }),
  })),
  price: z.object({
    value:         z.number().nullable(),
    currency_code: z.string(),
  }).nullable(),
  photos: z.array(z.object({ link: z.string().url() })).default([]),
  location: z.object({
    city:   z.object({ name: z.string() }).nullable(),
    region: z.object({ name: z.string() }).optional().nullable(),
  }).nullable(),
}).passthrough()

const OlxResponseSchema = z.object({
  data: z.array(OlxOfferSchema),
})

// ─── Param helpers ────────────────────────────────────────────────────────────

function getParam(params: z.infer<typeof OlxOfferSchema>['params'], key: string) {
  return params.find((p) => p.key === key)?.value ?? null
}

function parseArea(params: z.infer<typeof OlxOfferSchema>['params']): number | null {
  const v = getParam(params, 'total_area')
  if (!v?.label) return null
  const num = parseFloat(v.label.replace(',', '.'))
  return isNaN(num) ? null : num
}

function parseRooms(params: z.infer<typeof OlxOfferSchema>['params']): number | null {
  const v = getParam(params, 'rooms')
  if (!v?.label) return null
  const num = parseInt(v.label, 10)
  return isNaN(num) ? null : num
}

// ─── Transform ────────────────────────────────────────────────────────────────

function offerToScrapedListing(
  offer: z.infer<typeof OlxOfferSchema>,
  category: string,
): ScrapedListing {
  const cityName   = offer.location?.city?.name ?? null
  const regionName = offer.location?.region?.name ?? null
  const location   = [cityName, regionName].filter(Boolean).join(', ') || null

  const partial: Omit<ScrapedListing, 'contentHash'> = {
    source:        'olx',
    category:      category as ListingCategory,
    url:           offer.url,
    title:         offer.title,
    price:         offer.price?.value ?? null,
    priceCurrency: offer.price?.currency_code ?? 'PLN',
    pricePerM2:    null,
    areaM2:        parseArea(offer.params),
    rooms:         parseRooms(offer.params),
    floor:         null,
    totalFloors:   null,
    location,
    address:       null,
    lat:           null,
    lng:           null,
    description:   null,
    images:        offer.photos.map((p) => p.link),
    scrapedAt:     new Date(),
  }

  return {
    ...partial,
    contentHash: computeContentHash(partial as ScrapedListing),
  }
}

// ─── Main scrape function ─────────────────────────────────────────────────────

export async function scrapeOlxRealEstate(
  category: string,
  page: number,
): Promise<ScraperResult<ScrapedListing>> {
  const startMs  = Date.now()
  const errors: ScraperError[] = []

  const categoryId = CATEGORY_IDS[category]
  if (!categoryId) {
    return {
      source:     'olx',
      category,
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: `Unknown OLX category: ${category}`, code: 'PARSE_ERROR' }],
    }
  }

  const offset = (page - 1) * 50
  const url    = `https://www.olx.pl/api/v1/offers/?offset=${offset}&limit=50&category_id=${categoryId}&sort_by=created_at:desc`

  let rawData: unknown
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OtWebScraper/1.0)',
        'Accept':     'application/json',
        'Referer':    'https://www.olx.pl/',
      },
    })

    if (!response.ok) {
      throw new Error(`OLX API returned ${response.status}`)
    }

    rawData = await response.json()
  } catch (err) {
    return {
      source:     'olx',
      category,
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: String(err), code: 'NETWORK_ERROR' }],
    }
  }

  const parsed = OlxResponseSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      source:     'olx',
      category,
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: 'Schema validation failed', code: 'PARSE_ERROR' }],
    }
  }

  const { data } = parsed.data

  const items = data.flatMap((offer) => {
    try {
      return [offerToScrapedListing(offer, category)]
    } catch (err) {
      errors.push({ url: offer.url, message: String(err), code: 'PARSE_ERROR' })
      return []
    }
  })

  const hasMore = data.length === 50

  return {
    source:     'olx',
    category,
    items,
    page,
    hasMore,
    durationMs: Date.now() - startMs,
    errors,
  }
}
