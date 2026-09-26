import { SalaryRange } from '@/components/ui/SalaryRange'
import { TechStackTags } from '@/components/ui/TechStackTags'
import { MapPin } from 'lucide-react'
import type { JobSummary } from '@/types'

export function JobCardMeta({ job }: { job: JobSummary }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {job.location && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={12} /> {job.location}
          </span>
        )}
        <SalaryRange min={job.salaryMin} max={job.salaryMax} currency={job.currency} />
      </div>
      {job.techStack.length > 0 && (
        <TechStackTags tags={job.techStack} maxShow={3} />
      )}
    </div>
  )
}
