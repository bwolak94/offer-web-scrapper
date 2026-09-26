import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TechStackTags } from '@/components/ui/TechStackTags'

describe('TechStackTags', () => {
  it('renders all tags when count is within maxShow', () => {
    render(<TechStackTags tags={['React', 'TypeScript', 'Node']} maxShow={4} />)
    expect(screen.getByText('React')).toBeDefined()
    expect(screen.getByText('TypeScript')).toBeDefined()
    expect(screen.getByText('Node')).toBeDefined()
    expect(screen.queryByText(/more/)).toBeNull()
  })

  it('shows +N more badge when tags exceed maxShow (default 4)', () => {
    render(<TechStackTags tags={['React', 'TypeScript', 'Node', 'Go', 'Rust', 'Python']} />)
    // default maxShow=4: first 4 visible, +2 more
    expect(screen.getByText('React')).toBeDefined()
    expect(screen.getByText('TypeScript')).toBeDefined()
    expect(screen.getByText('Node')).toBeDefined()
    expect(screen.getByText('Go')).toBeDefined()
    expect(screen.queryByText('Rust')).toBeNull()
    expect(screen.queryByText('Python')).toBeNull()
    expect(screen.getByText('+2 more')).toBeDefined()
  })

  it('renders empty div with no badges when tags array is empty', () => {
    const { container } = render(<TechStackTags tags={[]} />)
    // No badge spans
    expect(screen.queryByText(/more/)).toBeNull()
    // The wrapper div is present but empty
    const wrapper = container.querySelector('div')
    expect(wrapper).toBeDefined()
    expect(wrapper!.children.length).toBe(0)
  })

  it('uses custom maxShow and shows correct +N more badge', () => {
    render(<TechStackTags tags={['A', 'B', 'C', 'D', 'E']} maxShow={2} />)
    expect(screen.getByText('A')).toBeDefined()
    expect(screen.getByText('B')).toBeDefined()
    expect(screen.queryByText('C')).toBeNull()
    expect(screen.getByText('+3 more')).toBeDefined()
  })

  it('does not show +N more badge when tags equal maxShow', () => {
    render(<TechStackTags tags={['A', 'B', 'C', 'D']} maxShow={4} />)
    expect(screen.queryByText(/more/)).toBeNull()
  })
})
