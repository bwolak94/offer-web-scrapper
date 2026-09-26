'use client'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { buttonVariants } from '@/components/ui/button'
import { Command, CommandList, CommandItem } from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown } from 'lucide-react'

const LISTING_SOURCES = ['otodom', 'olx', 'morizon', 'gratka'] as const
const JOB_SOURCES = ['pracuj', 'olx-praca', 'nofluffjobs', 'justjoinit'] as const

interface SourceMultiSelectProps {
  type: 'listing' | 'job'
  value: string[]
  onChange: (sources: string[]) => void
}

export function SourceMultiSelect({ type, value, onChange }: SourceMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const sources = type === 'listing' ? LISTING_SOURCES : JOB_SOURCES

  function toggle(source: string) {
    onChange(
      value.includes(source) ? value.filter((s) => s !== source) : [...value, source]
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Source
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' h-8 gap-1 text-xs'}>
          {value.length === 0 ? 'All sources' : `${value.length} selected`}
          <ChevronDown className="h-3 w-3" />
        </PopoverTrigger>
        <PopoverContent className="w-44 p-0" align="start">
          <Command>
            <CommandList>
              {sources.map((s) => (
                <CommandItem key={s} onSelect={() => toggle(s)} className="gap-2">
                  <Checkbox checked={value.includes(s)} />
                  <span className="text-xs">{s}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
