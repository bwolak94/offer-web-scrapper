import * as cheerio from 'cheerio'
import { z } from 'zod'
import { computeContentHash } from '@/pipeline/dedup'
import type { ScrapedListing, ScraperResult, ScraperError } from '@/types'
import type { ListingCategory } from '@/types'

// ─── URL construction ─────────────────────────────────────────────────────────

const CATEGORY_PATH: Record<string, string> = {
  sale:      'sprzedaz/mieszkanie',
  rent_long: 'wynajem/mieszkanie',
}

function buildOtodomUrl(category: string, page: number): string {
  const path = CATEGORY_PATH[category]
  if (!path) throw new Error(`Unknown Otodom category: ${category}`)
  return `https://www.otodom.pl/pl/oferty/${path}/cala-polska?page=${page}`
}

// ─── HTTP fetch + __NEXT_DATA__ extraction ────────────────────────────────────

async function fetchOtodomPage(url: string): Promise<unknown> {
  // AbortSignal.timeout prevents hanging indefinitely if Otodom is slow or unresponsive.
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: {
      'User-Agent':      'Mozilla/5.0 (compatible; OtWebScraper/1.0)',
      'Accept-Language': 'pl-PL,pl;q=0.9',
      'Accept':          'text/html,application/xhtml+xml',
    },
  })

  if (!response.ok) {
    throw new Error(`Otodom returned ${response.status} for ${url}`)
  }

  const html = await response.text()
  const $    = cheerio.load(html)
  const scriptContent = $('#__NEXT_DATA__').text()

  if (!scriptContent) {
    throw new Error('__NEXT_DATA__ script tag not found — Otodom page structure may have changed')
  }

  return JSON.parse(scriptContent)
}

// ─── Zod validation ───────────────────────────────────────────────────────────

const OtodomItemSchema = z.object({
  id:    z.union([z.string(), z.number()]).transform(String),
  slug:  z.string(),
  title: z.string(),
  totalPrice: z.object({
    value: z.number().nullable(),
  }).nullable(),
  areaInSquareMeters: z.number().nullable(),
  roomsNumber: z.string().nullable(),
  location: z.object({
    address: z.object({
      city:     z.object({ name: z.string() }).nullable(),
      district: z.object({ name: z.string() }).optional().nullable(),
    }).nullable(),
    mapDetails: z.object({
      lat: z.number().optional().nullable(),
      lng: z.number().optional().nullable(),
    }).passthrough().nullable(),
  }).passthrough().nullable(),
  images: z.array(z.object({
    large: z.string(),
  })).default([]),
}).passthrough()

const OtodomNextDataSchema = z.object({
  props: z.object({
    pageProps: z.object({
      data: z.object({
        searchAds: z.object({
          items: z.array(OtodomItemSchema),
          pagination: z.object({
            currentPage: z.number(),
            totalPages:  z.number(),
          }).passthrough().optional(),
        }),
      }),
    }),
  }),
})

// ─── Room number mapping ──────────────────────────────────────────────────────

const ROOMS_MAP: Record<string, number> = {
  ONE:         1,
  TWO:         2,
  THREE:       3,
  FOUR:        4,
  FIVE:        5,
  SIX_OR_MORE: 6,
}

function parseRooms(roomsNumber: string | null | undefined): number | null {
  if (!roomsNumber) return null
  return ROOMS_MAP[roomsNumber] ?? null
}

// ─── Transform to ScrapedListing ─────────────────────────────────────────────

function itemToScrapedListing(
  item: z.infer<typeof OtodomItemSchema>,
  category: string,
): ScrapedListing {
  const city     = item.location?.address?.city?.name ?? null
  const district = item.location?.address?.district?.name ?? null
  const location = [city, district].filter(Boolean).join(', ') || null

  const partial: Omit<ScrapedListing, 'contentHash'> = {
    source:        'otodom',
    category:      category as ListingCategory,
    url:           `https://www.otodom.pl/pl/oferta/${item.slug}`,
    title:         item.title,
    price:         item.totalPrice?.value ?? null,
    priceCurrency: 'PLN',
    pricePerM2:    null,
    areaM2:        item.areaInSquareMeters ?? null,
    rooms:         parseRooms(item.roomsNumber),
    floor:         null,
    totalFloors:   null,
    location,
    address:       null,
    lat:           item.location?.mapDetails?.lat ?? null,
    lng:           item.location?.mapDetails?.lng ?? null,
    description:   null,
    images:        item.images.map((img) => img.large),
    scrapedAt:     new Date(),
  }

  return {
    ...partial,
    contentHash: computeContentHash(partial as ScrapedListing),
  }
}

// ─── Main scrape function ─────────────────────────────────────────────────────

export async function scrapeOtodom(
  category: string,
  page: number,
): Promise<ScraperResult<ScrapedListing>> {
  const startMs = Date.now()
  const url     = buildOtodomUrl(category, page)
  const errors: ScraperError[] = []

  let rawData: unknown
  try {
    rawData = await fetchOtodomPage(url)
  } catch (err) {
    return {
      source: 'otodom',
      category,
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: String(err), code: 'NETWORK_ERROR' }],
    }
  }

  const parsed = OtodomNextDataSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      source: 'otodom',
      category,
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: 'Schema validation failed', code: 'PARSE_ERROR' }],
    }
  }

  const { items, pagination } = parsed.data.props.pageProps.data.searchAds

  const scrapedItems = items.flatMap((item) => {
    try {
      return [itemToScrapedListing(item, category)]
    } catch (err) {
      errors.push({ url: item.slug, message: String(err), code: 'PARSE_ERROR' })
      return []
    }
  })

  const totalPages = pagination?.totalPages ?? 1
  const hasMore = items.length > 0 && page < totalPages

  return {
    source:     'otodom',
    category,
    items:      scrapedItems,
    page,
    hasMore,
    durationMs: Date.now() - startMs,
    errors,
  }
}
