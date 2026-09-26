'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { LoadMoreSentinel } from './LoadMoreSentinel'
import type { ListingSummary } from '@/types'

interface VirtualizedListingListProps {
  items:              ListingSummary[]
  hasNextPage:        boolean
  isFetchingNextPage: boolean
  fetchNextPage:      () => void
}

export function VirtualizedListingList({
  items,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: VirtualizedListingListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const count = items.length + (hasNextPage ? 1 : 0)

  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 160,
    overscan: 5,
  })

  return (
    <div ref={parentRef} style={{ height: '100%', overflowY: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {virtualRow.index >= items.length ? (
              <LoadMoreSentinel
                onVisible={fetchNextPage}
                isLoading={isFetchingNextPage}
              />
            ) : (
              // Safe: virtualizer guarantees index < items.length (count guards above)
              <div className="mb-2 rounded-lg border bg-card p-4">
                <p className="font-medium">{items[virtualRow.index]?.title}</p>
                <p className="text-sm text-muted-foreground">
                  {items[virtualRow.index]?.price?.toLocaleString('pl-PL')} PLN
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
