'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface DescriptionBlockProps {
  text:      string | null
  maxLines?: number
}

export function DescriptionBlock({ text, maxLines = 6 }: DescriptionBlockProps) {
  const [expanded, setExpanded] = useState(false)

  if (!text) return null

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Description
      </h2>
      <p
        className="whitespace-pre-wrap text-sm leading-relaxed"
        style={
          !expanded
            ? {
                display:           '-webkit-box',
                WebkitLineClamp:   maxLines,
                WebkitBoxOrient:   'vertical',
                overflow:          'hidden',
              }
            : undefined
        }
      >
        {text}
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 text-xs underline underline-offset-4 hover:no-underline"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Show less' : 'Show more'}
      </Button>
    </div>
  )
}
