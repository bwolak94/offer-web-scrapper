'use client'

import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { VirtualizedJobList } from './VirtualizedJobList'
import { JobCard } from './JobCard'
import { ListSkeleton } from '@/components/listings/ListSkeleton'
import type { JobFilters, JobSummary, JobSource, EmploymentType, SortOrder } from '@/types'

const VALID_JOB_SOURCES: JobSource[] = ['pracuj', 'olx-praca', 'nofluffjobs', 'justjoinit']
const VALID_EMP_TYPES: EmploymentType[] = ['full_time', 'part_time', 'b2b', 'contract', 'internship']

type JobsPage = {
  data:  JobSummary[]
  total: number
  page:  number
  pages: number
}

async function fetchJobs({
  filters,
  pageParam,
}: {
  filters:   JobFilters
  pageParam: number
}): Promise<JobsPage> {
  const params = new URLSearchParams({
    type:     'job',
    page:     String(pageParam),
    pageSize: '50',
    ...Object.fromEntries(
      Object.entries(filters).flatMap(([k, v]) => {
        if (v == null || v === '' || v === false) return []
        if (Array.isArray(v)) return v.length > 0 ? [[k, v.join(',')]] : []
        return [[k, String(v)]]
      })
    ),
  })
  const res = await fetch(`/api/search?${params}`)
  if (!res.ok) throw new Error('Failed to fetch jobs')
  return res.json() as Promise<JobsPage>
}

export function JobsContainer() {
  const searchParams = useSearchParams()

  const filters: JobFilters = {
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

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<JobsPage, Error, { pages: JobsPage[]; pageParams: number[] }, readonly ['jobs', JobFilters], number>({
    queryKey:      ['jobs', filters] as const,
    queryFn:       ({ pageParam }) => fetchJobs({ filters, pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
    // Poll every 5s while any job is pending scoring.
    // Check scoreStatus === 'pending', NOT aiScore === null
    // (failed items keep aiScore=null permanently — checking that would poll forever).
    refetchInterval: (query) => {
      const allItems = query.state.data?.pages.flatMap((p) => p.data) ?? []
      const hasPending = allItems.some((item) => item.scoreStatus === 'pending')
      return hasPending ? 5_000 : false
    },
  })

  const allItems = data?.pages.flatMap((p) => p.data) ?? []

  if (isLoading) {
    return <ListSkeleton />
  }

  return (
    <VirtualizedJobList
      items={allItems}
      hasNextPage={!!hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      renderItem={(job) => <JobCard key={job.id} job={job} />}
    />
  )
}
