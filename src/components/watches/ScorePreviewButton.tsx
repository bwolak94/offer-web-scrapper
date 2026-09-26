'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScorePreviewResult } from './ScorePreviewResult'
import type { WatchType } from '@/types'

interface ScorePreviewButtonProps {
  criteria:  string
  watchType: WatchType
}

export function ScorePreviewButton({ criteria, watchType }: ScorePreviewButtonProps) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowPreview(true)}
        disabled={!criteria.trim()}
      >
        Preview Score
      </Button>

      {showPreview && (
        /*
          ScorePreviewResult is a Client Component using useQuery.
          It is NOT a Server Component — rendering a Server Component inside
          a Client Component's render tree is forbidden by Next.js RSC rules.
        */
        <ScorePreviewResult criteria={criteria} watchType={watchType} />
      )}
    </div>
  )
}
