'use client'

import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { LoadMoreSentinel } from '@/components/listings/LoadMoreSentinel'
import type { JobSummary } from '@/types'

interface VirtualizedJobListProps {
  items:              JobSummary[]
  hasNextPage:        boolean
  isFetchingNextPage: boolean
  fetchNextPage:      () => void
  // Slot prop — NEVER import JobCard directly here (RSC boundary rule)
  renderItem:         (job: JobSummary) => React.ReactNode
}

export function VirtualizedJobList({
  items,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  renderItem,
}: VirtualizedJobListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const count = items.length + (hasNextPage ? 1 : 0)

  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  })

  return (
    <div ref={parentRef} style={{ height: '100%', overflowY: 'auto' }}>
      {/*
        CRITICAL: position:relative on inner div + position:absolute on each row.
        All three positioning rules must hold or cards stack at y=0.
      */}
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            style={{
              position:  'absolute',
              top:       0,
              left:      0,
              width:     '100%',
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
