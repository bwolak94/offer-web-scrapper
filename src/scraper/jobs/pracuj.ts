import puppeteer from 'puppeteer-core'
import { computeContentHash } from '@/pipeline/dedup'
import type { ScrapedJob, ScraperResult, ScraperError } from '@/types'

// ─── Main scrape function ─────────────────────────────────────────────────────

export async function scrapePracuj(
  category: string,
  page: number,
): Promise<ScraperResult<ScrapedJob>> {
  const startMs = Date.now()
  const errors: ScraperError[] = []

  if (!process.env.BROWSERLESS_URL || !process.env.BROWSERLESS_TOKEN) {
    return {
      source:     'pracuj',
      category:   'jobs',
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: 'BROWSERLESS_URL or BROWSERLESS_TOKEN env var missing', code: 'NETWORK_ERROR' }],
    }
  }

  let browser: Awaited<ReturnType<typeof puppeteer.connect>> | null = null

  try {
    const wsEndpoint = `${process.env.BROWSERLESS_URL}?token=${process.env.BROWSERLESS_TOKEN}`
    browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint })
    const pg = await browser.newPage()
    await pg.goto(`https://it.pracuj.pl/praca?pn=${page}`, {
      waitUntil: 'networkidle2',
      timeout:   30_000,
    })

    // JSON-LD extraction (primary)
    const ldItems = await pg.$$eval('script[type="application/ld+json"]', (scripts) =>
      scripts.flatMap((s) => {
        try {
          const d = JSON.parse(s.textContent ?? '{}')
          return d['@type'] === 'JobPosting' ? [d] : []
        } catch { return [] }
      }),
    )

    // hasMore: check for next page link
    const hasMore = await pg
      .$('[data-test="bottom-pagination"] a[aria-label="Next page"]')
      .then((el) => !!el)
      .catch(() => false)

    const items: ScrapedJob[] = ldItems.flatMap((ld: Record<string, unknown>) => {
      try {
        const hiringOrg = ld['hiringOrganization'] as Record<string, unknown> | null
        const jobLoc    = ld['jobLocation'] as Record<string, unknown> | null
        const address   = jobLoc?.['address'] as Record<string, unknown> | null
        const salary    = ld['baseSalary'] as Record<string, unknown> | null
        const salaryVal = salary?.['value'] as Record<string, unknown> | null

        const partial: Omit<ScrapedJob, 'contentHash'> = {
          source:         'pracuj',
          url:            String(ld['url'] ?? ''),
          title:          String(ld['title'] ?? ''),
          company:        hiringOrg?.['name'] ? String(hiringOrg['name']) : null,
          location:       address?.['addressLocality'] ? String(address['addressLocality']) : null,
          remote:         null,
          salaryMin:      salaryVal?.['minValue'] ? Number(salaryVal['minValue']) : null,
          salaryMax:      salaryVal?.['maxValue'] ? Number(salaryVal['maxValue']) : null,
          currency:       salary?.['currency'] ? String(salary['currency']) : 'PLN',
          employmentType: null,
          techStack:      [],
          description:    ld['description'] ? String(ld['description']) : null,
          postedAt:       ld['datePosted'] ? new Date(String(ld['datePosted'])) : null,
          scrapedAt:      new Date(),
        }

        return [{ ...partial, contentHash: computeContentHash(partial as ScrapedJob) }]
      } catch { return [] }
    })

    return {
      source:     'pracuj',
      category:   'jobs',
      items,
      page,
      hasMore,
      durationMs: Date.now() - startMs,
      errors,
    }
  } catch (err) {
    return {
      source:     'pracuj',
      category:   'jobs',
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: String(err), code: 'NETWORK_ERROR' }],
    }
  } finally {
    await browser?.close()
  }
}
