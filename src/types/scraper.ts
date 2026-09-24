import type { RealEstateSource, JobSource, ListingCategory, EmploymentType } from './enums'

export interface ScrapedListing {
  source:        RealEstateSource
  category:      ListingCategory
  url:           string
  title:         string
  price:         number | null
  priceCurrency: string
  pricePerM2:    number | null
  areaM2:        number | null
  rooms:         number | null
  floor:         number | null
  totalFloors:   number | null
  location:      string | null
  address:       string | null
  lat:           number | null
  lng:           number | null
  description:   string | null
  images:        string[]
  contentHash:   string
  scrapedAt:     Date
  rawHtml?:      string  // debug only, never persisted
}

export interface ScrapedJob {
  source:         JobSource
  url:            string
  title:          string
  company:        string | null
  location:       string | null
  remote:         boolean | null
  salaryMin:      number | null
  salaryMax:      number | null
  currency:       string
  employmentType: EmploymentType | null
  techStack:      string[]
  description:    string | null
  contentHash:    string
  postedAt:       Date | null
  scrapedAt:      Date
  rawHtml?:       string  // debug only, never persisted
}

export interface ScraperResult<T extends ScrapedListing | ScrapedJob> {
  source:     string
  category:   string
  items:      T[]
  page:       number
  hasMore:    boolean
  durationMs: number
  errors:     ScraperError[]
}

export interface ScraperError {
  url?:    string
  message: string
  code:    'PARSE_ERROR' | 'NETWORK_ERROR' | 'BLOCKED' | 'TIMEOUT'
}
