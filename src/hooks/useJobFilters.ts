'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { JobFilters, JobSource, EmploymentType, SortOrder } from '@/types'

const VALID_JOB_SOURCES: JobSource[] = ['pracuj', 'olx-praca', 'nofluffjobs', 'justjoinit']
const VALID_EMP_TYPES: EmploymentType[] = ['full_time', 'part_time', 'b2b', 'contract', 'internship']

export function useJobFilters() {
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

  const getFilters = useCallback((): JobFilters => {
    return {
      q:        searchParams.get('q') ?? undefined,
      location: searchParams.get('location') ?? undefined,
      remote:   searchParams.get('remote') === '1' ? true
              : searchParams.get('remote') === '0' ? false
              : undefined,
      salaryMin: searchParams.get('salaryMin')
        ? Number(searchParams.get('salaryMin')) : undefined,
      salaryMax: searchParams.get('salaryMax')
        ? Number(searchParams.get('salaryMax')) : undefined,
      employmentType: searchParams.get('employmentType')
        ?.split(',')
        .filter((v): v is EmploymentType => VALID_EMP_TYPES.includes(v as EmploymentType)),
      techStack: searchParams.get('techStack')
        ? searchParams.get('techStack')!.split(',').filter(Boolean)
        : undefined,
      source: searchParams.get('source')
        ?.split(',')
        .filter((v): v is JobSource => VALID_JOB_SOURCES.includes(v as JobSource)),
      scoreMin: searchParams.get('scoreMin')
        ? Number(searchParams.get('scoreMin')) : undefined,
      sort:     (searchParams.get('sort') as SortOrder | null) ?? undefined,
      semantic: searchParams.get('semantic') === '1',
    }
  }, [searchParams])

  return { setFilter, getFilters, searchParams }
}
