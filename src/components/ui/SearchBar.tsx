'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Search, Zap } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchBarProps {
  placeholder?: string
}

export function SearchBar({ placeholder = 'Search listings and jobs…' }: SearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Stable string dep — avoids object-identity churn and makes exhaustive-deps happy
  const searchParamsString = searchParams.toString()

  const [value, setValue] = useState(() => searchParams.get('q') ?? '')
  const [semantic, setSemantic] = useState(() => searchParams.get('semantic') === '1')

  // Text input is debounced — semantic toggle fires instantly (binary, no typing lag expected)
  const debouncedValue = useDebounce(value, 400)

  // Sync debounced text + instant semantic → URL params.
  // Guard: only push when values actually changed — prevents infinite router.push loop.
  useEffect(() => {
    const params          = new URLSearchParams(searchParamsString)
    const currentQ        = params.get('q') ?? ''
    const currentSemantic = params.get('semantic') === '1'

    if (debouncedValue === currentQ && semantic === currentSemantic) return

    if (debouncedValue === '') {
      params.delete('q')
    } else {
      params.set('q', debouncedValue)
    }
    // semantic=0 pollutes URLs — only write semantic=1; absence means false
    if (semantic) {
      params.set('semantic', '1')
    } else {
      params.delete('semantic')
    }
    params.delete('page')

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [debouncedValue, semantic, pathname, router, searchParamsString])

  // Re-sync input when `q` is cleared externally (e.g. FilterBar "Reset" deletes all params)
  useEffect(() => {
    const urlQ = new URLSearchParams(searchParamsString).get('q') ?? ''
    if (urlQ !== value) setValue(urlQ)
    // intentionally only re-run when URL changes, not when local value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Immediately flush debounce on Enter / Search button click
    const params = new URLSearchParams(searchParamsString)
    if (value === '') {
      params.delete('q')
    } else {
      params.set('q', value)
    }
    if (semantic) {
      params.set('semantic', '1')
    } else {
      params.delete('semantic')
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-1 max-w-xl items-center gap-2"
      role="search"
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-9 pl-8 pr-3"
          type="search"
          aria-label="Search query"
        />
      </div>

      <Tooltip>
        <TooltipTrigger
          render={
            <div>
              <Toggle
                pressed={semantic}
                onPressedChange={setSemantic}
                aria-label={semantic ? 'Semantic search on' : 'Semantic search off'}
                size="sm"
                variant="outline"
                className="h-9 w-9 shrink-0 p-0"
              >
                <Zap
                  className={`h-4 w-4 ${semantic ? 'text-yellow-500' : 'text-muted-foreground'}`}
                />
              </Toggle>
            </div>
          }
        />
        <TooltipContent side="bottom" className="text-xs">
          {semantic ? 'AI semantic search — ON' : 'Keyword search (click for AI)'}
        </TooltipContent>
      </Tooltip>

      <Button type="submit" size="sm" className="h-9 shrink-0">
        Search
      </Button>
    </form>
  )
}
