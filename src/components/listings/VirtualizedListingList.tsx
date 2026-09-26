'use client'

import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { LoadMoreSentinel } from './LoadMoreSentinel'
import type { ListingSummary } from '@/types'

interface VirtualizedListingListProps {
  items:              ListingSummary[]
  hasNextPage:        boolean
  isFetchingNextPage: boolean
  fetchNextPage:      () => void
  renderItem:         (item: ListingSummary) => React.ReactNode
}

export function VirtualizedListingList({
  items,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  renderItem,
}: VirtualizedListingListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const count = items.length + (hasNextPage ? 1 : 0)

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 160,
    overscan: 5,
  })

  return (
    <div ref={parentRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
              renderItem(items[virtualRow.index]!)
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
