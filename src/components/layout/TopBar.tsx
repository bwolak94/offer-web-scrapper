import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center border-b bg-background px-4 gap-4">
      {/* SearchBar slot — populated in FE-07 */}
      <div className="flex-1" id="search-bar-slot" />
      <ThemeToggle />
    </header>
  )
}
