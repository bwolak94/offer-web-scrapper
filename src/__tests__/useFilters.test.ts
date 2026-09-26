import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useFilters } from '@/hooks/useFilters'

const mockPush = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/real-estate/sale',
  useSearchParams: () => mockSearchParams,
}))

describe('useFilters', () => {
  beforeEach(() => {
    mockPush.mockClear()
    // Reset URLSearchParams
    Array.from(mockSearchParams.keys()).forEach((k) => mockSearchParams.delete(k))
  })

  it('returns empty filters when no params set', () => {
    const { result } = renderHook(() => useFilters())
    const filters = result.current.getFilters()
    expect(filters.priceMin).toBeUndefined()
    expect(filters.q).toBeUndefined()
    expect(filters.semantic).toBe(false)
  })

  it('parses priceMin and priceMax as numbers', () => {
    mockSearchParams.set('priceMin', '100000')
    mockSearchParams.set('priceMax', '500000')
    const { result } = renderHook(() => useFilters())
    const filters = result.current.getFilters()
    expect(filters.priceMin).toBe(100000)
    expect(filters.priceMax).toBe(500000)
  })

  it('parses rooms as number array', () => {
    mockSearchParams.set('rooms', '2,3,4')
    const { result } = renderHook(() => useFilters())
    expect(result.current.getFilters().rooms).toEqual([2, 3, 4])
  })

  it('filters out invalid source values', () => {
    mockSearchParams.set('source', 'otodom,unknown,olx')
    const { result } = renderHook(() => useFilters())
    expect(result.current.getFilters().source).toEqual(['otodom', 'olx'])
  })

  it('returns semantic:true when param is "1"', () => {
    mockSearchParams.set('semantic', '1')
    const { result } = renderHook(() => useFilters())
    expect(result.current.getFilters().semantic).toBe(true)
  })

  it('returns semantic:false when param is absent', () => {
    const { result } = renderHook(() => useFilters())
    expect(result.current.getFilters().semantic).toBe(false)
  })

  it('returns semantic:false when param is "0"', () => {
    mockSearchParams.set('semantic', '0')
    const { result } = renderHook(() => useFilters())
    expect(result.current.getFilters().semantic).toBe(false)
  })

  it('setFilter calls router.push with updated param', () => {
    const { result } = renderHook(() => useFilters())
    act(() => {
      result.current.setFilter('location', 'Warszawa')
    })
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('location=Warszawa'),
      { scroll: false }
    )
  })

  it('setFilter deletes param when value is null', () => {
    mockSearchParams.set('location', 'Warszawa')
    const { result } = renderHook(() => useFilters())
    act(() => {
      result.current.setFilter('location', null)
    })
    const pushed = mockPush.mock.calls[0]?.[0] as string
    expect(pushed).not.toContain('location=')
  })

  it('setFilter always removes page param', () => {
    mockSearchParams.set('page', '3')
    const { result } = renderHook(() => useFilters())
    act(() => {
      result.current.setFilter('location', 'Kraków')
    })
    const pushed = mockPush.mock.calls[0]?.[0] as string
    expect(pushed).not.toContain('page=')
  })
})
