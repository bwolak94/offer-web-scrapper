import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { JobCardHeader } from './JobCardHeader'
import { JobCardMeta } from './JobCardMeta'
import type { JobSummary } from '@/types'

export function JobCard({ job }: { job: JobSummary }) {
  return (
    <Link href={`/job/${job.id}`} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <Card className="mb-2 transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <JobCardHeader job={job} />
          <JobCardMeta job={job} />
        </CardContent>
      </Card>
    </Link>
  )
}
