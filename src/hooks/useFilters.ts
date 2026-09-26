'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { ListingFilters, RealEstateSource, SortOrder } from '@/types'

const VALID_RE_SOURCES: RealEstateSource[] = ['otodom', 'olx', 'morizon', 'gratka']

export function useFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const getFilters = useCallback((): ListingFilters => {
    return {
      q:        searchParams.get('q')        ?? undefined,
      priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
      priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
      areaMin:  searchParams.get('areaMin')  ? Number(searchParams.get('areaMin'))  : undefined,
      areaMax:  searchParams.get('areaMax')  ? Number(searchParams.get('areaMax'))  : undefined,
      rooms:    searchParams.get('rooms')
                  ? searchParams.get('rooms')!.split(',').map(Number)
                  : undefined,
      location: searchParams.get('location') ?? undefined,
      source:   searchParams.get('source')
                  ?.split(',')
                  .filter((s): s is RealEstateSource => VALID_RE_SOURCES.includes(s as RealEstateSource)),
      scoreMin: searchParams.get('scoreMin') ? Number(searchParams.get('scoreMin')) : undefined,
      sort:     (searchParams.get('sort') as SortOrder | null) ?? undefined,
      semantic: searchParams.get('semantic') === '1',
    }
  }, [searchParams])

  return { setFilter, getFilters, searchParams }
}
