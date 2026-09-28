'use client'

import { useEffect, useRef } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ScoreBadgeProps {
  score:      number | null
  reason?:    string
  size?:      'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const SIZE_MAP = {
  sm: { dim: 32, strokeWidth: 3,   showNumber: false },
  md: { dim: 44, strokeWidth: 3.5, showNumber: true  },
  lg: { dim: 56, strokeWidth: 4,   showNumber: true  },
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'var(--color-score-high)'
  if (score >= 40) return 'var(--color-score-mid)'
  return 'var(--color-score-low)'
}

export function ScoreBadge({ score, reason, size = 'md', showLabel = false }: ScoreBadgeProps) {
  const arcRef = useRef<SVGCircleElement>(null)
  const { dim, strokeWidth, showNumber } = SIZE_MAP[size]
  const radius       = (dim - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    if (score === null || !arcRef.current) return
    const target = circumference - (score / 100) * circumference
    // rAF lets the browser commit the initial dashoffset before the transition fires
    const raf = requestAnimationFrame(() => {
      if (arcRef.current) arcRef.current.style.strokeDashoffset = String(target)
    })
    return () => cancelAnimationFrame(raf)
  }, [score, circumference])

  // Pending: spinning dashed ring
  if (score === null) {
    return (
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        className="animate-spin"
        style={{ animationDuration: '2s' }}
        aria-label="Scoring in progress"
      >
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="var(--color-muted-foreground)"
          strokeOpacity={0.4}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
          strokeLinecap="round"
        />
      </svg>
    )
  }

  const color = getScoreColor(score)

  const badge = (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        {/* Animated arc */}
        <circle
          ref={arcRef}
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      {showNumber && (
        <span
          className="absolute font-bold tabular-nums"
          style={{ color, fontSize: size === 'lg' ? '0.875rem' : '0.7rem' }}
          aria-label={`Score: ${score}`}
        >
          {score}
        </span>
      )}
    </div>
  )

  const content = showLabel && size === 'lg' ? (
    <div className="flex flex-col items-center gap-0.5">
      {badge}
      <span className="text-xs text-muted-foreground">AI score</span>
    </div>
  ) : badge

  if (!reason) return content

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<div className="cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />}
        >
          {content}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
