import type { ScrapedListing, ScraperResult } from '@/types'

export async function scrapeGratka(
  category: string,
  page: number,
): Promise<ScraperResult<ScrapedListing>> {
  return {
    source:     'gratka',
    category,
    items:      [],
    page,
    hasMore:    false,
    durationMs: 0,
    errors:     [{ message: 'Gratka scraper not yet implemented (requires Cloudflare bypass)', code: 'NETWORK_ERROR' }],
  }
}
