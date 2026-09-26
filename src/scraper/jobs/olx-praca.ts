import { z } from 'zod'
import { computeContentHash } from '@/pipeline/dedup'
import type { ScrapedJob, ScraperResult, ScraperError } from '@/types'
import type { EmploymentType } from '@/types'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const OlxJobOfferSchema = z.object({
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

const OlxJobResponseSchema = z.object({
  data: z.array(OlxJobOfferSchema),
})

// ─── Param helpers ────────────────────────────────────────────────────────────

function getParam(params: z.infer<typeof OlxJobOfferSchema>['params'], key: string) {
  return params.find((p) => p.key === key)?.value ?? null
}

function mapEmploymentType(label: string): EmploymentType | null {
  const map: Record<string, EmploymentType> = {
    'Pełny etat':     'full_time',
    'Niepełny etat':  'part_time',
    'Umowa B2B':      'b2b',
    'Umowa zlecenie': 'contract',
  }
  return map[label] ?? null
}

function parseSalaryFromText(text: string): { min: number | null; max: number | null } {
  const match = text.match(/(\d[\d\s]*)\s*[-–]\s*(\d[\d\s]*)/)
  if (!match) return { min: null, max: null }
  const min = parseFloat((match[1] ?? '').replace(/\s/g, ''))
  const max = parseFloat((match[2] ?? '').replace(/\s/g, ''))
  return {
    min: isNaN(min) ? null : min,
    max: isNaN(max) ? null : max,
  }
}

// ─── Transform ────────────────────────────────────────────────────────────────

function offerToScrapedJob(offer: z.infer<typeof OlxJobOfferSchema>): ScrapedJob {
  const cityName   = offer.location?.city?.name ?? null
  const regionName = offer.location?.region?.name ?? null
  const location   = [cityName, regionName].filter(Boolean).join(', ') || null

  const salaryParam     = getParam(offer.params, 'salary')
  const salaryText      = salaryParam?.label ?? ''
  const { min, max }    = parseSalaryFromText(salaryText)

  const employmentParam = getParam(offer.params, 'employment_type')
  const employmentType  = employmentParam?.label
    ? mapEmploymentType(employmentParam.label)
    : null

  const partial: Omit<ScrapedJob, 'contentHash'> = {
    source:         'olx-praca',
    url:            offer.url,
    title:          offer.title,
    company:        null,
    location,
    remote:         null,
    salaryMin:      min,
    salaryMax:      max,
    currency:       'PLN',
    employmentType,
    techStack:      [],
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

export async function scrapeOlxPraca(
  category: string,
  page: number,
): Promise<ScraperResult<ScrapedJob>> {
  const startMs = Date.now()
  const errors: ScraperError[] = []

  const offset = (page - 1) * 50
  const url    = `https://www.olx.pl/api/v1/offers/?offset=${offset}&limit=50&category_id=4&sort_by=created_at:desc`

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
      throw new Error(`OLX Praca API returned ${response.status}`)
    }

    rawData = await response.json()
  } catch (err) {
    return {
      source:     'olx-praca',
      category:   'jobs',
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: String(err), code: 'NETWORK_ERROR' }],
    }
  }

  const parsed = OlxJobResponseSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      source:     'olx-praca',
      category:   'jobs',
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
      return [offerToScrapedJob(offer)]
    } catch (err) {
      errors.push({ url: offer.url, message: String(err), code: 'PARSE_ERROR' })
      return []
    }
  })

  const hasMore = data.length === 50

  return {
    source:     'olx-praca',
    category:   'jobs',
    items,
    page,
    hasMore,
    durationMs: Date.now() - startMs,
    errors,
  }
}
