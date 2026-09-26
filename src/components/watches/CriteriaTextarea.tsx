'use client'

import { Textarea } from '@/components/ui/textarea'

interface CriteriaTextareaProps {
  value:      string
  onChange:   (value: string) => void
  maxLength?: number
}

export function CriteriaTextarea({
  value,
  onChange,
  maxLength = 500,
}: CriteriaTextareaProps) {
  return (
    <div className="space-y-1.5">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={4}
        placeholder="Describe what you're looking for. E.g.: 'Apartment in Mokotów, 50–80m², max 2 floors above ground, quiet street, near metro'."
        className="resize-none"
      />
      <p className="text-right text-xs text-muted-foreground">
        {value.length}/{maxLength}
      </p>
    </div>
  )
}
