import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ScoreBadgeProps {
  score:      number | null
  reason?:    string
  size?:      'sm' | 'md' | 'lg'
  showLabel?: boolean
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function ScoreBadge({ score, reason, size = 'md', showLabel = false }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <div className="flex flex-col gap-1">
        {showLabel && <span className="text-xs text-muted-foreground">Scoring…</span>}
        <Skeleton className={size === 'sm' ? 'h-2 w-12' : size === 'lg' ? 'h-4 w-32' : 'h-3 w-20'} />
      </div>
    )
  }

  const bar = (
    <div className="flex flex-col gap-0.5">
      {showLabel && <span className="text-xs font-medium">{score}/100</span>}
      <Progress
        value={score}
        className={size === 'sm' ? 'h-2 w-12' : size === 'lg' ? 'h-4 w-32' : 'h-3 w-20'}
        indicatorClassName={getScoreColor(score)}
      />
    </div>
  )

  if (!reason) return bar

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<div className="cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />}
        >
          {bar}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
