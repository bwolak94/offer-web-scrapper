import { render, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { LoadMoreSentinel } from '@/components/listings/LoadMoreSentinel'

// IntersectionObserver mock
let observerCallback: IntersectionObserverCallback
const mockObserve = vi.fn()
const mockDisconnect = vi.fn()

beforeEach(() => {
  mockObserve.mockClear()
  mockDisconnect.mockClear()

  // Must use a real constructor function (not arrow) so `new IntersectionObserver()` works.
  global.IntersectionObserver = vi.fn().mockImplementation(function (cb: IntersectionObserverCallback) {
    observerCallback = cb
    return {
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: vi.fn(),
    }
  }) as unknown as typeof IntersectionObserver
})

describe('LoadMoreSentinel', () => {
  it('calls onVisible when element enters viewport', () => {
    const onVisible = vi.fn()
    render(<LoadMoreSentinel onVisible={onVisible} isLoading={false} />)

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })

    expect(onVisible).toHaveBeenCalledTimes(1)
  })

  it('does not call onVisible when not intersecting', () => {
    const onVisible = vi.fn()
    render(<LoadMoreSentinel onVisible={onVisible} isLoading={false} />)

    act(() => {
      observerCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })

    expect(onVisible).not.toHaveBeenCalled()
  })

  it('does not call onVisible while isLoading is true (isFetchingRef guard)', () => {
    const onVisible = vi.fn()
    render(<LoadMoreSentinel onVisible={onVisible} isLoading={true} />)

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })

    // isFetchingRef.current is set to true because isLoading=true (via the first useEffect),
    // so the guard prevents onVisible from being called.
    expect(onVisible).not.toHaveBeenCalled()
  })

  it('shows skeletons when isLoading is true', () => {
    render(<LoadMoreSentinel onVisible={vi.fn()} isLoading={true} />)
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows no skeletons when isLoading is false', () => {
    render(<LoadMoreSentinel onVisible={vi.fn()} isLoading={false} />)
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBe(0)
  })

  it('disconnects observer on unmount', () => {
    const { unmount } = render(<LoadMoreSentinel onVisible={vi.fn()} isLoading={false} />)
    unmount()
    expect(mockDisconnect).toHaveBeenCalled()
  })
})
