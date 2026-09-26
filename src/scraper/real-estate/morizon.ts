import * as cheerio from 'cheerio'
import { computeContentHash } from '@/pipeline/dedup'
import type { ScrapedListing, ScraperResult, ScraperError } from '@/types'
import type { ListingCategory } from '@/types'

// ─── URL construction ─────────────────────────────────────────────────────────

const CATEGORY_URL: Record<string, string> = {
  sale:      'https://www.morizon.pl/mieszkania/na-sprzedaz/',
  rent_long: 'https://www.morizon.pl/mieszkania/do-wynajecia/',
}

function buildMorizonUrl(category: string, page: number): string {
  const base = CATEGORY_URL[category]
  if (!base) throw new Error(`Unknown Morizon category: ${category}`)
  return `${base}?page=${page}`
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

function parsePrice(text: string): number | null {
  // Remove "zł/mc", "zł", spaces, nbsp, then parse
  const cleaned = text
    .replace(/zł\/mc/gi, '')
    .replace(/zł/gi, '')
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseArea(text: string): number | null {
  const cleaned = text
    .replace(/m²|m2/gi, '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseRooms(text: string): number | null {
  const cleaned = text.replace(/\D/g, '').trim()
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? null : num
}

// ─── Main scrape function ─────────────────────────────────────────────────────

export async function scrapeMorizon(
  category: string,
  page: number,
): Promise<ScraperResult<ScrapedListing>> {
  const startMs = Date.now()
  const errors: ScraperError[] = []

  let url: string
  try {
    url = buildMorizonUrl(category, page)
  } catch (err) {
    return {
      source:     'morizon',
      category,
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: String(err), code: 'PARSE_ERROR' }],
    }
  }

  let html: string
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: {
        'User-Agent':      'Mozilla/5.0 (compatible; OtWebScraper/1.0)',
        'Accept':          'text/html,application/xhtml+xml',
        'Accept-Language': 'pl-PL,pl;q=0.9',
      },
    })

    if (!response.ok) {
      throw new Error(`Morizon returned ${response.status} for ${url}`)
    }

    html = await response.text()
  } catch (err) {
    return {
      source:     'morizon',
      category,
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: String(err), code: 'NETWORK_ERROR' }],
    }
  }

  const $ = cheerio.load(html)
  const cards = $('article[data-item-id]')
  const items: ScrapedListing[] = []

  cards.each((_i, el) => {
    try {
      const card = $(el)

      // Title + URL
      const anchor =
        card.find('a[data-tracking-event-name="listing_item_click"]').first() ||
        card.find('.propertyList__itemTitle a').first()
      const title = anchor.text().trim() || card.find('h2, h3').first().text().trim()
      const href  = anchor.attr('href') ?? ''
      const itemUrl = href.startsWith('http') ? href : `https://www.morizon.pl${href}`

      if (!title || !href) return

      // Price
      const priceText =
        card.find('.propertyList__itemPrice').first().text() ||
        card.find('[class*="price"]').first().text()
      const price = parsePrice(priceText)

      // Area
      const areaText =
        card.find('[class*="area"]').first().text() ||
        card.find('.param--area').first().text()
      const areaM2 = parseArea(areaText)

      // Rooms
      const roomsText =
        card.find('[class*="rooms"]').first().text() ||
        card.find('.param--rooms').first().text()
      const rooms = parseRooms(roomsText)

      // Location
      const location =
        card.find('.propertyList__itemLocation').first().text().trim() ||
        card.find('[class*="location"]').first().text().trim() ||
        null

      // Images
      const images: string[] = []
      card.find('img[src]').each((_j, img) => {
        const src = $(img).attr('src')
        if (src && src.startsWith('http')) images.push(src)
      })

      const partial: Omit<ScrapedListing, 'contentHash'> = {
        source:        'morizon',
        category:      category as ListingCategory,
        url:           itemUrl,
        title,
        price,
        priceCurrency: 'PLN',
        pricePerM2:    null,
        areaM2,
        rooms,
        floor:         null,
        totalFloors:   null,
        location:      location || null,
        address:       null,
        lat:           null,
        lng:           null,
        description:   null,
        images,
        scrapedAt:     new Date(),
      }

      items.push({
        ...partial,
        contentHash: computeContentHash(partial as ScrapedListing),
      })
    } catch (err) {
      errors.push({ message: String(err), code: 'PARSE_ERROR' })
    }
  })

  const hasMore = $('.pagination__next').length > 0

  return {
    source:     'morizon',
    category,
    items,
    page,
    hasMore,
    durationMs: Date.now() - startMs,
    errors,
  }
}
