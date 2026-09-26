import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { JobSummary } from '@/types'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    <a href={href} {...props}>{children}</a>,
}))

// Mock sub-components to isolate JobCard
vi.mock('@/components/jobs/JobCardHeader', () => ({
  JobCardHeader: ({ job }: { job: JobSummary }) => (
    <div data-testid="job-card-header">
      <span>{job.title}</span>
      {job.company && <span data-testid="company-name">{job.company}</span>}
    </div>
  ),
}))

vi.mock('@/components/jobs/JobCardMeta', () => ({
  JobCardMeta: ({ job }: { job: JobSummary }) =>
    <div data-testid="job-card-meta" />,
}))

import { JobCard } from '@/components/jobs/JobCard'

const mockJob: JobSummary = {
  id: 'job-001',
  source: 'justjoinit',
  url: 'https://justjoin.it/job-001',
  title: 'Senior Frontend Developer',
  company: 'Acme Corp',
  location: 'Warszawa',
  salaryMin: 15000,
  salaryMax: 25000,
  currency: 'PLN',
  employmentType: 'b2b',
  techStack: ['React', 'TypeScript'],
  remote: true,
  aiScore: null,
  scoreStatus: 'pending',
  scrapedAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('JobCard', () => {
  it('renders a link pointing to /job/{id}', () => {
    render(<JobCard job={mockJob} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/job/job-001')
  })

  it('renders the job title via JobCardHeader', () => {
    render(<JobCard job={mockJob} />)
    expect(screen.getByText('Senior Frontend Developer')).toBeDefined()
  })

  it('renders company name when provided', () => {
    render(<JobCard job={mockJob} />)
    expect(screen.getByTestId('company-name')).toBeDefined()
    expect(screen.getByText('Acme Corp')).toBeDefined()
  })

  it('does not render company when company is null', () => {
    const jobNoCompany = { ...mockJob, company: null }
    render(<JobCard job={jobNoCompany} />)
    expect(screen.queryByTestId('company-name')).toBeNull()
  })

  it('renders JobCardHeader and JobCardMeta sub-components', () => {
    render(<JobCard job={mockJob} />)
    expect(screen.getByTestId('job-card-header')).toBeDefined()
    expect(screen.getByTestId('job-card-meta')).toBeDefined()
  })
})
