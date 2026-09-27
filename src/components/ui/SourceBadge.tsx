import type { Source } from '@/types'

interface SourceConfig {
  classes:  string
  dot:      string
  label:    string
}

// Systematic palette: every source uses the same token structure
// (bg-{color}-50/text-{color}-700 light, bg-{color}-950/60 text-{color}-300 dark)
// and a filled dot at the {color}-500 shade. Consistent saturation & lightness.
const SOURCE_CONFIG: Record<string, SourceConfig> = {
  otodom:      { classes: 'bg-amber-50   text-amber-700   dark:bg-amber-950/60   dark:text-amber-300',   dot: 'bg-amber-500',   label: 'Otodom' },
  olx:         { classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', dot: 'bg-emerald-500', label: 'OLX' },
  morizon:     { classes: 'bg-blue-50    text-blue-700    dark:bg-blue-950/60    dark:text-blue-300',    dot: 'bg-blue-500',    label: 'Morizon' },
  gratka:      { classes: 'bg-violet-50  text-violet-700  dark:bg-violet-950/60  dark:text-violet-300',  dot: 'bg-violet-500',  label: 'Gratka' },
  pracuj:      { classes: 'bg-rose-50    text-rose-700    dark:bg-rose-950/60    dark:text-rose-300',    dot: 'bg-rose-500',    label: 'Pracuj' },
  nofluffjobs: { classes: 'bg-sky-50     text-sky-700     dark:bg-sky-950/60     dark:text-sky-300',     dot: 'bg-sky-500',     label: 'NoFluffJobs' },
  justjoinit:  { classes: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300', dot: 'bg-fuchsia-500', label: 'JustJoinIT' },
  'olx-praca': { classes: 'bg-teal-50    text-teal-700    dark:bg-teal-950/60    dark:text-teal-300',    dot: 'bg-teal-500',    label: 'OLX Praca' },
}

const FALLBACK: SourceConfig = {
  classes: 'bg-muted text-muted-foreground',
  dot:     'bg-muted-foreground',
  label:   '',
}

interface SourceBadgeProps {
  source: Source
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const config = SOURCE_CONFIG[source] ?? { ...FALLBACK, label: source }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${config.classes}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  )
}
