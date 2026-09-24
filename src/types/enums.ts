export const ListingCategory = {
  SALE:       'sale',
  RENT_LONG:  'rent_long',
  RENT_SHORT: 'rent_short',
} as const
export type ListingCategory = typeof ListingCategory[keyof typeof ListingCategory]

export const RealEstateSource = {
  OTODOM:  'otodom',
  OLX:     'olx',
  MORIZON: 'morizon',
  GRATKA:  'gratka',
} as const
export type RealEstateSource = typeof RealEstateSource[keyof typeof RealEstateSource]

export const JobSource = {
  PRACUJ:      'pracuj',
  OLX_PRACA:   'olx-praca',
  NOFLUFFJOBS: 'nofluffjobs',
  JUSTJOINIT:  'justjoinit',
} as const
export type JobSource = typeof JobSource[keyof typeof JobSource]

export type Source = RealEstateSource | JobSource

export const EmploymentType = {
  FULL_TIME:  'full_time',
  PART_TIME:  'part_time',
  B2B:        'b2b',
  CONTRACT:   'contract',
  INTERNSHIP: 'internship',
} as const
export type EmploymentType = typeof EmploymentType[keyof typeof EmploymentType]

export const WatchType = {
  LISTING: 'listing',
  JOB:     'job',
} as const
export type WatchType = typeof WatchType[keyof typeof WatchType]

export const RefType = {
  LISTING: 'listing',
  JOB:     'job',
} as const
export type RefType = typeof RefType[keyof typeof RefType]

export type ScoreStatus = 'pending' | 'scored' | 'failed'

export const SortOrder = {
  SCORE_DESC:  'score_desc',
  PRICE_ASC:   'price_asc',
  PRICE_DESC:  'price_desc',
  DATE_DESC:   'date_desc',
  AREA_ASC:    'area_asc',
  SALARY_DESC: 'salary_desc',
} as const
export type SortOrder = typeof SortOrder[keyof typeof SortOrder]

export const ViewMode = {
  LIST:  'list',
  MAP:   'map',
  SPLIT: 'split',
} as const
export type ViewMode = typeof ViewMode[keyof typeof ViewMode]
