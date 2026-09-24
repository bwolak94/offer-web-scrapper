import type { ListingCategory, RealEstateSource, JobSource, EmploymentType, SortOrder, ViewMode } from './enums'

export interface ListingFilters {
  q?:        string
  category?: ListingCategory
  priceMin?: number
  priceMax?: number
  areaMin?:  number
  areaMax?:  number
  rooms?:    number[]
  location?: string
  source?:   RealEstateSource[]
  scoreMin?: number
  sort?:     SortOrder
  page?:     number
  pageSize?: number
  semantic?: boolean
  view?:     ViewMode
}

export interface JobFilters {
  q?:              string
  location?:       string
  remote?:         boolean
  salaryMin?:      number
  salaryMax?:      number
  employmentType?: EmploymentType[]
  techStack?:      string[]
  source?:         JobSource[]
  scoreMin?:       number
  sort?:           SortOrder
  page?:           number
  pageSize?:       number
  semantic?:       boolean
}

// Serialised form — all values are strings (from URLSearchParams)
export interface RawListingFilters {
  q?:        string
  category?: string
  priceMin?: string
  priceMax?: string
  areaMin?:  string
  areaMax?:  string
  rooms?:    string  // comma-separated: "2,3,4"
  location?: string
  source?:   string  // comma-separated
  scoreMin?: string
  sort?:     string
  page?:     string
  pageSize?: string
  semantic?: string  // "0" | "1"
  view?:     string
}

export interface RawJobFilters {
  q?:              string
  location?:       string
  remote?:         string  // "0" | "1"
  salaryMin?:      string
  salaryMax?:      string
  employmentType?: string  // comma-separated
  techStack?:      string  // comma-separated
  source?:         string  // comma-separated
  scoreMin?:       string
  sort?:           string
  page?:           string
  pageSize?:       string
  semantic?:       string
}

// Discriminated union for FilterBar component — enables TypeScript narrowing
export type FilterBarProps =
  | { type: 'listing'; value?: ListingFilters; onChange?: (f: ListingFilters) => void }
  | { type: 'job';     value?: JobFilters;     onChange?: (f: JobFilters) => void }
