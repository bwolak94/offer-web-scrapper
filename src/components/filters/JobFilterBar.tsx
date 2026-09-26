'use client'

import { useJobFilters } from '@/hooks/useJobFilters'
import { LocationInput } from './LocationInput'
import { SalaryRangeSlider } from './SalaryRangeSlider'
import { EmploymentTypeSelect } from './EmploymentTypeSelect'
import { TechStackInput } from './TechStackInput'
import { SourceMultiSelect } from './SourceMultiSelect'
import { ScoreMinSlider } from './ScoreMinSlider'
import { SortSelect } from './SortSelect'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Toggle } from '@/components/ui/toggle'
import { Wifi } from 'lucide-react'

const JOB_SORT_OPTIONS = ['score_desc', 'salary_desc', 'date_desc'] as const

export function JobFilterBar() {
  const { setFilter, getFilters } = useJobFilters()
  const filters = getFilters()

  function handleReset() {
    for (const k of [
      'q', 'location', 'remote', 'salaryMin', 'salaryMax',
      'employmentType', 'techStack', 'source', 'scoreMin', 'sort', 'semantic',
    ]) {
      setFilter(k, null)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      <LocationInput
        value={filters.location ?? ''}
        onChange={(val) => setFilter('location', val || null)}
        placeholder="City or remote…"
      />

      <SalaryRangeSlider
        value={[filters.salaryMin ?? 0, filters.salaryMax ?? 50_000]}
        onChange={([min, max]) => {
          setFilter('salaryMin', min > 0 ? String(min) : null)
          setFilter('salaryMax', max < 50_000 ? String(max) : null)
        }}
      />

      <EmploymentTypeSelect
        value={filters.employmentType ?? []}
        onChange={(types) => setFilter('employmentType', types.length > 0 ? types.join(',') : null)}
      />

      <TechStackInput
        value={filters.techStack ?? []}
        onChange={(tags) => setFilter('techStack', tags.length > 0 ? tags.join(',') : null)}
      />

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Remote</Label>
        <Toggle
          pressed={filters.remote === true}
          onPressedChange={(pressed) => setFilter('remote', pressed ? '1' : null)}
          size="sm"
          variant="outline"
          aria-label="Remote only"
          className="h-8 gap-1.5 px-2 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Wifi size={12} />
          Remote only
        </Toggle>
      </div>

      <SourceMultiSelect
        type="job"
        value={(filters.source as string[]) ?? []}
        onChange={(sources) => setFilter('source', sources.length > 0 ? sources.join(',') : null)}
      />

      <ScoreMinSlider
        value={filters.scoreMin ?? 0}
        onChange={(val) => setFilter('scoreMin', val > 0 ? String(val) : null)}
      />

      <SortSelect
        value={filters.sort ?? 'date_desc'}
        onChange={(val) => setFilter('sort', val)}
        options={[...JOB_SORT_OPTIONS]}
      />

      <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs">
        Reset
      </Button>
    </div>
  )
}
