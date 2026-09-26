import { z } from 'zod'
import { computeContentHash } from '@/pipeline/dedup'
import type { ScrapedJob, ScraperResult, ScraperError } from '@/types'
import type { EmploymentType } from '@/types'

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const NoFluffPostingSchema = z.object({
  id:   z.string(),
  name: z.string(),
  url:  z.string(),
  location: z.object({
    places:      z.array(z.object({ city: z.string() })).default([]),
    fullyRemote: z.boolean().default(false),
  }),
  salary: z.object({
    from:     z.number().nullable(),
    to:       z.number().nullable(),
    currency: z.string(),
    type:     z.string(),
  }).nullable(),
  technology:  z.string().nullable(),
  seniority:   z.array(z.string()).default([]),
  requirement: z.object({ skillsNeeded: z.array(z.string()) }).nullable(),
  posted:      z.string(),
  company:     z.object({ name: z.string() }).nullable(),
}).passthrough()

const NoFluffResponseSchema = z.object({
  postings:   z.array(NoFluffPostingSchema),
  totalCount: z.number().optional(),
  totalPages: z.number().optional(),
})

// ─── Employment type mapping ──────────────────────────────────────────────────

function mapEmploymentType(type: string): EmploymentType | null {
  const map: Record<string, EmploymentType> = {
    permanent: 'full_time',
    b2b:       'b2b',
  }
  return map[type.toLowerCase()] ?? null
}

// ─── Transform ────────────────────────────────────────────────────────────────

function postingToScrapedJob(posting: z.infer<typeof NoFluffPostingSchema>): ScrapedJob {
  const cities   = posting.location.places.map((p) => p.city).filter(Boolean)
  const location = posting.location.fullyRemote
    ? 'Remote'
    : cities.join(', ') || null

  const techStack = [
    posting.technology,
    ...(posting.requirement?.skillsNeeded ?? []),
  ].filter((s): s is string => Boolean(s))

  const employmentType = mapEmploymentType(posting.salary?.type ?? '')

  const partial: Omit<ScrapedJob, 'contentHash'> = {
    source:         'nofluffjobs',
    url:            `https://nofluffjobs.com/job/${posting.url}`,
    title:          posting.name,
    company:        posting.company?.name ?? null,
    location,
    remote:         posting.location.fullyRemote,
    salaryMin:      posting.salary?.from ?? null,
    salaryMax:      posting.salary?.to ?? null,
    currency:       posting.salary?.currency ?? 'PLN',
    employmentType,
    techStack,
    description:    null,
    postedAt:       posting.posted ? new Date(posting.posted) : null,
    scrapedAt:      new Date(),
  }

  return {
    ...partial,
    contentHash: computeContentHash(partial as ScrapedJob),
  }
}

// ─── Main scrape function ─────────────────────────────────────────────────────

export async function scrapeNoFluffJobs(
  category: string,
  page: number,
): Promise<ScraperResult<ScrapedJob>> {
  const startMs = Date.now()
  const errors: ScraperError[] = []

  let rawData: unknown
  try {
    const response = await fetch('https://nofluffjobs.com/api/search/posting', {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':   'Mozilla/5.0 (compatible; OtWebScraper/1.0)',
      },
      body: JSON.stringify({
        criteriaSearch: { city: [], requirement: [], remote: [] },
        page,
        itemsPerPage: 50,
      }),
    })

    if (!response.ok) {
      throw new Error(`NoFluffJobs API returned ${response.status}`)
    }

    rawData = await response.json()
  } catch (err) {
    return {
      source:     'nofluffjobs',
      category:   'jobs',
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: String(err), code: 'NETWORK_ERROR' }],
    }
  }

  const parsed = NoFluffResponseSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      source:     'nofluffjobs',
      category:   'jobs',
      items:      [],
      page,
      hasMore:    false,
      durationMs: Date.now() - startMs,
      errors:     [{ message: 'Schema validation failed', code: 'PARSE_ERROR' }],
    }
  }

  const { postings, totalPages } = parsed.data

  const items = postings.flatMap((posting) => {
    try {
      return [postingToScrapedJob(posting)]
    } catch (err) {
      errors.push({ url: posting.url, message: String(err), code: 'PARSE_ERROR' })
      return []
    }
  })

  const hasMore = postings.length > 0 && page < (totalPages ?? 1)

  return {
    source:     'nofluffjobs',
    category:   'jobs',
    items,
    page,
    hasMore,
    durationMs: Date.now() - startMs,
    errors,
  }
}
