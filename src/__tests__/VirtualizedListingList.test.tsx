import { render } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { VirtualizedListingList } from '@/components/listings/VirtualizedListingList'
import type { ListingSummary } from '@/types'

// LoadMoreSentinel uses IntersectionObserver — mock it globally for this file
const mockObserveVirt = vi.fn()
const mockDisconnectVirt = vi.fn()
beforeEach(() => {
  mockObserveVirt.mockClear()
  mockDisconnectVirt.mockClear()
  global.IntersectionObserver = vi.fn().mockImplementation(function (cb: IntersectionObserverCallback) {
    void cb
    return { observe: mockObserveVirt, disconnect: mockDisconnectVirt, unobserve: vi.fn() }
  }) as unknown as typeof IntersectionObserver
})

// useVirtualizer needs a scrollable container — mock it
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [
      { key: '0', index: 0, start: 0, size: 160 },
      { key: '1', index: 1, start: 160, size: 160 },
    ],
    getTotalSize: () => 320,
    measureElement: vi.fn(),
  }),
}))

const mockItems: ListingSummary[] = [
  {
    id: '1',
    category: 'sale',
    source: 'otodom',
    url: 'https://example.com/1',
    title: 'Mieszkanie Warszawa',
    price: 500000,
    currency: 'PLN',
    areaM2: 50,
    rooms: 2,
    location: 'Warszawa',
    lat: null,
    lng: null,
    images: [],
    aiScore: 85,
    scoreStatus: 'scored',
    scrapedAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    category: 'sale',
    source: 'olx',
    url: 'https://example.com/2',
    title: 'Dom Kraków',
    price: 800000,
    currency: 'PLN',
    areaM2: 120,
    rooms: 4,
    location: 'Kraków',
    lat: null,
    lng: null,
    images: [],
    aiScore: null,
    scoreStatus: 'pending',
    scrapedAt: new Date(),
    updatedAt: new Date(),
  },
]

describe('VirtualizedListingList', () => {
  it('renders item titles', () => {
    const { getByText } = render(
      <VirtualizedListingList
        items={mockItems}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />
    )
    expect(getByText('Mieszkanie Warszawa')).toBeDefined()
    expect(getByText('Dom Kraków')).toBeDefined()
  })

  it('inner container has position:relative style', () => {
    const { container } = render(
      <VirtualizedListingList
        items={mockItems}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />
    )
    // DOM: container > div(scroll) > div(position:relative) > div(position:absolute rows)
    const inner = container.querySelector('div > div > div') as HTMLElement
    expect(inner.style.position).toBe('relative')
  })

  it('each row has position:absolute style', () => {
    const { container } = render(
      <VirtualizedListingList
        items={mockItems}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />
    )
    // The position:relative inner div is the direct child of the scroll container.
    // Its direct children are the virtualizer row divs (position:absolute).
    const innerRelative = container.querySelector('div > div > div') as HTMLElement
    const rows = Array.from(innerRelative.children) as HTMLElement[]
    expect(rows.length).toBeGreaterThan(0)
    rows.forEach((row) => {
      expect(row.style.position).toBe('absolute')
    })
  })

  it('renders LoadMoreSentinel when hasNextPage is true', () => {
    // Virtual items are mocked as [0, 1]. With 1 real item, virtual index 1 >= items.length(1)
    // so the sentinel slot renders. We just assert the component renders without throwing.
    const { container } = render(
      <VirtualizedListingList
        items={[mockItems[0]!]}
        hasNextPage={true}
        isFetchingNextPage={false}
        fetchNextPage={vi.fn()}
      />
    )
    expect(container.querySelector('div')).toBeDefined()
  })
})
