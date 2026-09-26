import type { Scraper } from '@/types'
import { RealEstateSource, JobSource } from '@/types'
import { scrapeOtodom }        from './real-estate/otodom'
import { scrapeOlxRealEstate } from './real-estate/olx'
import { scrapeMorizon }       from './real-estate/morizon'
import { scrapeGratka }        from './real-estate/gratka'
import { scrapeNoFluffJobs }   from './jobs/nofluffjobs'
import { scrapeJustJoinIt }    from './jobs/justjoinit'
import { scrapePracuj }        from './jobs/pracuj'
import { scrapeOlxPraca }      from './jobs/olx-praca'

const VALID_SOURCES = new Set<string>([
  ...Object.values(RealEstateSource),
  ...Object.values(JobSource),
])

// Object.create(null) prevents prototype pollution via __proto__ / constructor keys
const scrapers: Record<string, Scraper> = Object.create(null) as Record<string, Scraper>

export function getScraper(source: string): Scraper | null {
  return scrapers[source] ?? null
}

export function registerScraper(source: string, scraper: Scraper): void {
  if (!VALID_SOURCES.has(source)) {
    throw new Error(`[scraper] Unknown source: ${source}`)
  }
  scrapers[source] = scraper
}

// ─── Scraper registrations ────────────────────────────────────────────────────

registerScraper('otodom',       { scrape: scrapeOtodom })
registerScraper('olx',         { scrape: scrapeOlxRealEstate })
registerScraper('morizon',     { scrape: scrapeMorizon })
registerScraper('gratka',      { scrape: scrapeGratka })
registerScraper('nofluffjobs', { scrape: scrapeNoFluffJobs })
registerScraper('justjoinit',  { scrape: scrapeJustJoinIt })
registerScraper('pracuj',      { scrape: scrapePracuj })
registerScraper('olx-praca',   { scrape: scrapeOlxPraca })
