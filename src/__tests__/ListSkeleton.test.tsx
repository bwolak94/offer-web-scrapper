import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ListSkeleton } from '@/components/listings/ListSkeleton'

describe('ListSkeleton', () => {
  it('renders 8 skeleton cards', () => {
    render(<ListSkeleton />)
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBe(8)
  })
})
