'use client'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
}

export function LocationInput({ value, onChange }: LocationInputProps) {
  const [local, setLocal] = useState(value)

  // Sync with external value (e.g., on filter reset)
  useEffect(() => { setLocal(value) }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local)
    }, 300)
    return () => clearTimeout(timer)
  }, [local, onChange, value])

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">Location</Label>
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="City, district..."
        className="h-8 w-36 text-xs"
      />
    </div>
  )
}
