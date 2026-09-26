import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { FilterBar } from '@/components/filters/FilterBar'
import { FilterBarSkeleton } from '@/components/filters/FilterBarSkeleton'
import { ListingsContainer } from '@/components/listings/ListingsContainer'
import { ListSkeleton } from '@/components/listings/ListSkeleton'
import type { ListingCategory } from '@/types'

const CATEGORY_MAP: Record<string, ListingCategory> = {
  'sale':       'sale',
  'rent-long':  'rent_long',
  'rent-short': 'rent_short',
}

interface PageProps {
  params: Promise<{ category: string }>
}

export default async function RealEstateCategoryPage({ params }: PageProps) {
  const { category: categorySlug } = await params
  const category = CATEGORY_MAP[categorySlug]
  if (!category) notFound()

  return (
    <div className="flex h-full flex-col gap-4">
      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterBar type="listing" />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <ListingsContainer category={category} />
      </Suspense>
    </div>
  )
}

export async function generateStaticParams() {
  return [
    { category: 'sale' },
    { category: 'rent-long' },
    { category: 'rent-short' },
  ]
}
