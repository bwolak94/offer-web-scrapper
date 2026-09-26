'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

interface TechStackInputProps {
  value:    string[]
  onChange: (tags: string[]) => void
}

export function TechStackInput({ value, onChange }: TechStackInputProps) {
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    const clean = raw.trim().toLowerCase()
    if (clean && !value.includes(clean)) {
      onChange([...value, clean])
    }
    setInputVal('')
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[160px] max-w-[240px]">
      <Label className="text-xs">Tech Stack</Label>
      <div
        role="group"
        aria-label="Tech stack tags"
        className="flex flex-wrap gap-1 rounded-md border px-2 py-1 cursor-text min-h-[36px] bg-background"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs gap-1 h-5">
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              className="hover:text-destructive focus-visible:outline-none focus-visible:text-destructive"
            >
              <X size={10} />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addTag(inputVal)
            }
            if (e.key === 'Backspace' && inputVal === '' && value.length > 0) {
              removeTag(value[value.length - 1]!)
            }
          }}
          onBlur={() => { if (inputVal.trim()) addTag(inputVal) }}
          placeholder={value.length === 0 ? 'Type & Enter…' : ''}
          className="h-6 flex-1 min-w-[80px] border-0 p-0 text-xs focus-visible:ring-0 shadow-none"
        />
      </div>
    </div>
  )
}
