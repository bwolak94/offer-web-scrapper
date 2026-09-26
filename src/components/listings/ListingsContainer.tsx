'use client'

import { useSearchParams } from 'next/navigation'
import { useInfiniteQuery } from '@tanstack/react-query'
import { VirtualizedListingList } from './VirtualizedListingList'
import { ListSkeleton } from './ListSkeleton'
import { ListingCard } from './ListingCard'
import type { ListingCategory, ListingSummary, ListingFilters, RealEstateSource, SortOrder } from '@/types'

const VALID_RE_SOURCES: RealEstateSource[] = ['otodom', 'olx', 'morizon', 'gratka']

type ListingsPage = {
  data: ListingSummary[]
  total: number
  page: number
  pages: number
}

async function fetchListings({
  category,
  filters,
  pageParam,
}: {
  category:  ListingCategory
  filters:   ListingFilters
  pageParam: number
}): Promise<ListingsPage> {
  const params = new URLSearchParams({
    type: 'listing',
    category,
    page: String(pageParam),
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
  if (!res.ok) throw new Error('Failed to fetch listings')
  return res.json() as Promise<ListingsPage>
}

interface ListingsContainerProps {
  category: ListingCategory
}

export function ListingsContainer({ category }: ListingsContainerProps) {
  const searchParams = useSearchParams()

  const filters: ListingFilters = {
    q:        searchParams.get('q') ?? undefined,
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

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<ListingsPage, Error, { pages: ListingsPage[]; pageParams: number[] }, readonly ['listings', ListingCategory, ListingFilters], number>({
    queryKey: ['listings', category, filters] as const,
    queryFn: ({ pageParam }) => fetchListings({ category, filters, pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
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

  if (allItems.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">No listings found.</p>
        <p className="text-xs">Try adjusting your filters or check back after scraping runs.</p>
      </div>
    )
  }

  return (
    <VirtualizedListingList
      items={allItems}
      hasNextPage={!!hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      fetchNextPage={fetchNextPage}
      renderItem={(item) => <ListingCard key={item.id} listing={item} />}
    />
  )
}
