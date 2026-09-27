import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { JobCardHeader } from './JobCardHeader'
import { JobCardMeta } from './JobCardMeta'
import type { JobSummary } from '@/types'

function getScoreBorderColor(score: number | null): string {
  if (score === null) return 'var(--color-border)'
  if (score >= 70) return 'var(--color-score-high)'
  if (score >= 40) return 'var(--color-score-mid)'
  return 'var(--color-score-low)'
}

export function JobCard({ job }: { job: JobSummary }) {
  return (
    <Link href={`/job/${job.id}`} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <Card
        className="mb-2 border-l-4 shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
        style={{ borderLeftColor: getScoreBorderColor(job.aiScore) }}
      >
        <CardContent className="p-4">
          <JobCardHeader job={job} />
          <JobCardMeta job={job} />
        </CardContent>
      </Card>
    </Link>
  )
}
