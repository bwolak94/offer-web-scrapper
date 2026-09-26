import React from 'react'
import { MapPin, CalendarDays, RefreshCw, Globe } from 'lucide-react'
import { TechStackTags } from '@/components/ui/TechStackTags'
import type { JobPublic } from '@/types'

type MetaItem = { label: string; value: string; icon: React.JSX.Element }

export function JobMetaGrid({ job }: { job: JobPublic }) {
  const items: MetaItem[] = [
    job.location    ? { label: 'Location',    value: job.location,                                        icon: <MapPin size={14} /> }     : null,
    job.remote != null ? { label: 'Remote',   value: job.remote ? 'Yes' : 'No',                          icon: <Globe size={14} /> }      : null,
    { label: 'Scraped',    value: new Date(job.scrapedAt).toLocaleDateString('pl-PL'),  icon: <CalendarDays size={14} /> },
    { label: 'Last update', value: new Date(job.updatedAt).toLocaleDateString('pl-PL'), icon: <RefreshCw size={14} /> },
  ].filter((x): x is MetaItem => x !== null)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <span className="mt-0.5 text-muted-foreground">{item.icon}</span>
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
      {job.techStack.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">Tech Stack</p>
          <TechStackTags tags={job.techStack} maxShow={20} />
        </div>
      )}
    </div>
  )
}
