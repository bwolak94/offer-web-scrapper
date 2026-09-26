/**
 * Dev scraper runner — bypasses QStash, runs directly against the local DB.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/scrape-dev.ts <source> <category> [page]
 *
 * Examples:
 *   npx tsx --env-file=.env.local scripts/scrape-dev.ts otodom sale
 *   npx tsx --env-file=.env.local scripts/scrape-dev.ts olx rent_long
 *   npx tsx --env-file=.env.local scripts/scrape-dev.ts nofluffjobs jobs
 *   npx tsx --env-file=.env.local scripts/scrape-dev.ts otodom sale 2
 *
 * Available sources:
 *   real-estate: otodom, olx, morizon, gratka
 *   jobs:        nofluffjobs, justjoinit, pracuj, olx-praca
 *
 * Available categories:
 *   real-estate: sale, rent_long, rent_short
 *   jobs:        jobs
 */

import '@/scraper'   // registers all scrapers
import { getScraper } from '@/scraper'
import { runListingPipeline, runJobPipeline } from '@/pipeline'
import type { ScrapedListing, ScrapedJob } from '@/types'

const [source, category, pageArg] = process.argv.slice(2)
const page = pageArg ? parseInt(pageArg, 10) : 1

if (!source || !category) {
  console.error('Usage: npx tsx --env-file=.env.local scripts/scrape-dev.ts <source> <category> [page]')
  process.exit(1)
}

const scraper = getScraper(source)
if (!scraper) {
  console.error(`No scraper registered for source: "${source}"`)
  console.error('Available: otodom, olx, morizon, gratka, nofluffjobs, justjoinit, pracuj, olx-praca')
  process.exit(1)
}

console.log(`\nScraping ${source} / ${category} / page ${page}...`)

async function main() {
  const result = await scraper!.scrape(category!, page)

  if (result.errors.length > 0) {
    console.warn(`Scraper errors (${result.errors.length}):`, result.errors)
  }

  console.log(`Scraped ${result.items.length} items in ${result.durationMs}ms`)

  if (result.items.length === 0) {
    console.log('No items to save.')
    return
  }

  const isJobs = category === 'jobs'
  const pipeline = isJobs
    ? await runJobPipeline(result.items as ScrapedJob[])
    : await runListingPipeline(result.items as ScrapedListing[])

  console.log(`\nPipeline result:`)
  console.log(`  inserted: ${pipeline.inserted}`)
  console.log(`  updated:  ${pipeline.updated}`)
  console.log(`  skipped:  ${pipeline.skipped}`)
  console.log(`  hasMore:  ${result.hasMore}`)

  if (result.hasMore) {
    console.log(`\nThere are more pages. Run with page ${page + 1}:`)
    console.log(`  npx tsx --env-file=.env.local scripts/scrape-dev.ts ${source} ${category} ${page + 1}`)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
