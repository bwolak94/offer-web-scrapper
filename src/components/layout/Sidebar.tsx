import { SidebarNav } from './SidebarNav'

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-background lg:flex lg:flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-sm font-semibold">Offer Scrapper</span>
      </div>
      <SidebarNav />
    </aside>
  )
}
