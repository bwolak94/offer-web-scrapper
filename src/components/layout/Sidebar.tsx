import { SidebarNav } from './SidebarNav'

function LogoMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="var(--color-primary)" />
      <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="1.5" fill="white" />
    </svg>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
        <LogoMark />
        <span className="font-heading text-sm font-bold tracking-tight text-sidebar-foreground">
          Oferta
        </span>
      </div>
      <SidebarNav />
    </aside>
  )
}
