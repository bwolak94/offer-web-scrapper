'use client'

import { Toggle } from '@/components/ui/toggle'
import { Label } from '@/components/ui/label'
import type { EmploymentType } from '@/types'

const TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'full_time',  label: 'Full-time' },
  { value: 'part_time',  label: 'Part-time' },
  { value: 'b2b',        label: 'B2B' },
  { value: 'contract',   label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

interface EmploymentTypeSelectProps {
  value:    EmploymentType[]
  onChange: (types: EmploymentType[]) => void
}

export function EmploymentTypeSelect({ value, onChange }: EmploymentTypeSelectProps) {
  function toggle(type: EmploymentType) {
    onChange(
      value.includes(type)
        ? value.filter((t) => t !== type)
        : [...value, type]
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">Employment</Label>
      <div className="flex flex-wrap gap-1">
        {TYPES.map((t) => (
          <Toggle
            key={t.value}
            pressed={value.includes(t.value)}
            onPressedChange={() => toggle(t.value)}
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
          >
            {t.label}
          </Toggle>
        ))}
      </div>
    </div>
  )
}
