'use client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

const SORT_LABELS: Record<string, string> = {
  score_desc:  'Best score',
  price_asc:   'Price \u2191',
  price_desc:  'Price \u2193',
  date_desc:   'Newest',
  area_asc:    'Area \u2191',
  salary_desc: 'Salary \u2193',
}

interface SortSelectProps {
  value: string
  onChange: (value: string) => void
  options: string[]
}

export function SortSelect({ value, onChange, options }: SortSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">Sort</Label>
      <Select value={value} onValueChange={(v) => { if (v !== null) onChange(v) }}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-xs">
              {SORT_LABELS[opt] ?? opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
