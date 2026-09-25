import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FilterBarSkeleton } from '@/components/filters/FilterBarSkeleton'

describe('FilterBarSkeleton', () => {
  it('renders 5 skeleton placeholders', () => {
    render(<FilterBarSkeleton />)
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBe(5)
  })
})
