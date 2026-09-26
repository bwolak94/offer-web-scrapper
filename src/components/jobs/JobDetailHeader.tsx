import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { SalaryRange } from '@/components/ui/SalaryRange'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { JobPublic } from '@/types'

const EMP_LABELS: Record<string, string> = {
  full_time:  'Full-time',
  part_time:  'Part-time',
  b2b:        'B2B',
  contract:   'Contract',
  internship: 'Internship',
}

export function JobDetailHeader({ job }: { job: JobPublic }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold leading-tight">{job.title}</h1>
          {job.company && (
            <p className="text-base text-muted-foreground">{job.company}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {job.employmentType && (
              <Badge variant="secondary">
                {EMP_LABELS[job.employmentType] ?? job.employmentType}
              </Badge>
            )}
            {job.remote === true && <Badge variant="outline">Remote</Badge>}
            <SourceBadge source={job.source} />
          </div>
        </div>
        <ScoreBadge score={job.aiScore} size="lg" showLabel />
      </div>
      <SalaryRange
        min={job.salaryMin}
        max={job.salaryMax}
        currency={job.currency}
      />
      <Separator />
    </div>
  )
}
