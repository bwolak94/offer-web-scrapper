import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { SourceBadge } from '@/components/ui/SourceBadge'
import type { JobSummary } from '@/types'

export function JobCardHeader({ job }: { job: JobSummary }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-2">
      <div>
        <p className="font-medium leading-tight">{job.title}</p>
        {job.company && <p className="text-sm text-muted-foreground">{job.company}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <ScoreBadge score={job.aiScore} size="sm" />
        <SourceBadge source={job.source} />
      </div>
    </div>
  )
}
