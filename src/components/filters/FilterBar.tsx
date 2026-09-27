'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useFilters } from '@/hooks/useFilters'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { PriceRangeSlider } from './PriceRangeSlider'
import { AreaRangeSlider } from './AreaRangeSlider'
import { RoomsSelect } from './RoomsSelect'
import { LocationInput } from './LocationInput'
import { SourceMultiSelect } from './SourceMultiSelect'
import { ScoreMinSlider } from './ScoreMinSlider'
import { SortSelect } from './SortSelect'
import { Button } from '@/components/ui/button'
import type { ListingFilters, JobFilters } from '@/types'

type FilterBarProps =
  | { type: 'listing'; embedded?: false; value?: never;         onChange?: never }
  | { type: 'listing'; embedded: true;  value?: ListingFilters; onChange?: (f: ListingFilters) => void }
  | { type: 'job';     embedded?: false; value?: never;         onChange?: never }
  | { type: 'job';     embedded: true;  value?: JobFilters;      onChange?: (f: JobFilters) => void }

export function FilterBar(props: FilterBarProps) {
  const { setFilter, getFilters } = useFilters()
  const filters = props.embedded ? (props.value ?? {}) : getFilters()
  const [isOpen, setIsOpen] = useState(true)
  const reduced = useReducedMotion()

  function handleChange(key: string, value: string | null) {
    if (props.embedded && props.onChange) {
      if (props.type === 'listing') {
        (props.onChange as (f: ListingFilters) => void)({
          ...(filters as ListingFilters),
          [key]: value ?? undefined,
        })
      } else {
        (props.onChange as (f: JobFilters) => void)({
          ...(filters as JobFilters),
          [key]: value ?? undefined,
        })
      }
    } else {
      setFilter(key, value)
    }
  }

  const listingFilters = filters as ListingFilters
  const jobFilters = filters as JobFilters

  return (
    <div className="rounded-lg border bg-card shadow-[var(--shadow-card)]">
      {/* Mobile collapse toggle */}
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium lg:hidden"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-controls="filter-bar-content"
      >
        <span>Filters</span>
        <ChevronDown
          className="h-4 w-4 text-muted-foreground transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        />
      </button>

      <motion.div
        id="filter-bar-content"
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0 }}
        transition={{ duration: reduced ? 0 : 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="overflow-hidden"
      >
        <div className="flex flex-wrap items-end gap-3 p-4">
          {props.type === 'listing' && (
            <>
              <PriceRangeSlider
                value={[listingFilters.priceMin ?? 0, listingFilters.priceMax ?? 5_000_000]}
                onChange={([min, max]) => {
                  handleChange('priceMin', String(min))
                  handleChange('priceMax', String(max))
                }}
              />
              <AreaRangeSlider
                value={[listingFilters.areaMin ?? 0, listingFilters.areaMax ?? 300]}
                onChange={([min, max]) => {
                  handleChange('areaMin', String(min))
                  handleChange('areaMax', String(max))
                }}
              />
              <RoomsSelect
                value={listingFilters.rooms ?? []}
                onChange={(rooms) => handleChange('rooms', rooms.length > 0 ? rooms.join(',') : null)}
              />
            </>
          )}
          <LocationInput
            value={
              (props.type === 'listing' ? listingFilters.location : jobFilters.location) ?? ''
            }
            onChange={(val) => handleChange('location', val || null)}
          />
          <SourceMultiSelect
            type={props.type}
            value={
              ((props.type === 'listing'
                ? listingFilters.source
                : jobFilters.source) as string[] | undefined) ?? []
            }
            onChange={(sources) =>
              handleChange('source', sources.length > 0 ? sources.join(',') : null)
            }
          />
          <ScoreMinSlider
            value={
              (props.type === 'listing' ? listingFilters.scoreMin : jobFilters.scoreMin) ?? 0
            }
            onChange={(val) => handleChange('scoreMin', val > 0 ? String(val) : null)}
          />
          <SortSelect
            value={
              ((props.type === 'listing'
                ? listingFilters.sort
                : jobFilters.sort) as string | undefined) ?? 'date_desc'
            }
            onChange={(val) => handleChange('sort', val)}
            options={
              props.type === 'listing'
                ? ['score_desc', 'price_asc', 'price_desc', 'date_desc', 'area_asc']
                : ['score_desc', 'salary_desc', 'date_desc']
            }
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (props.embedded && props.onChange) {
                if (props.type === 'listing') {
                  (props.onChange as (f: ListingFilters) => void)({})
                } else {
                  (props.onChange as (f: JobFilters) => void)({})
                }
              } else {
                ;[
                  'priceMin',
                  'priceMax',
                  'areaMin',
                  'areaMax',
                  'rooms',
                  'location',
                  'source',
                  'scoreMin',
                  'sort',
                  'q',
                  'semantic',
                ].forEach((k) => setFilter(k, null))
              }
            }}
          >
            Reset
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
