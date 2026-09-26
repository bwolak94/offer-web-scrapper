import { Suspense } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { SearchBar } from '@/components/ui/SearchBar'

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center border-b bg-background px-4 gap-4">
      {/*
        SearchBar calls useSearchParams() — must be in Suspense at the nearest
        Server Component boundary or Next.js blocks the entire layout from
        static rendering. (PLAN_REVIEW Issue 1.2)
      */}
      <Suspense
        fallback={
          <div className="h-9 flex-1 max-w-xl animate-pulse rounded-md bg-muted" />
        }
      >
        <SearchBar />
      </Suspense>
      <ThemeToggle />
    </header>
  )
}
