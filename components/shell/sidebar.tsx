'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import {
  IconChart,
  IconChevronLeft,
  IconFolder,
  IconGauge,
  IconInbox,
  IconLogo,
} from '@/components/ui/icons'

type NavItem = { href: string; label: string; icon: React.ReactNode }

export type SidebarProject = {
  id: string
  name: string
  key: string
  color: string
}

/**
 * The app shell's left rail.
 *
 * Collapsed state is remembered in localStorage and applied on mount. The
 * server can't know it, so the first frame renders expanded — acceptable
 * because the transition is 200ms and the layout does not reflow content
 * beneath it.
 */
export function Sidebar({
  projects,
  workspaceName,
}: {
  projects: SidebarProject[]
  workspaceName: string
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('btl-sidebar') === 'collapsed')
    } catch {
      /* private mode */
    }
  }, [])

  function toggle() {
    setCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem('btl-sidebar', next ? 'collapsed' : 'expanded')
      } catch {
        /* private mode */
      }
      return next
    })
  }

  const nav: NavItem[] = [
    { href: '/', label: 'Projects', icon: <IconFolder className="size-4" /> },
    { href: '/my-tasks', label: 'My tasks', icon: <IconInbox className="size-4" /> },
    { href: '/workload', label: 'Workload', icon: <IconGauge className="size-4" /> },
    { href: '/reports', label: 'Reports', icon: <IconChart className="size-4" /> },
  ]

  return (
    <aside
      className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface
                  transition-[width] duration-200 ease-out md:flex
                  ${collapsed ? 'w-16' : 'w-60'}`}
    >
      <div className="flex h-14 items-center gap-2.5 px-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg p-1">
          <IconLogo className="size-7 shrink-0" />
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight text-fg">
                BTL
              </span>
              <span className="block truncate text-[11px] leading-tight text-subtle">
                {workspaceName}
              </span>
            </span>
          ) : null}
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2" aria-label="Main">
        {nav.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            }
            collapsed={collapsed}
          />
        ))}

        {projects.length > 0 ? (
          <div className="pt-4">
            {!collapsed ? (
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                Projects
              </p>
            ) : (
              <div className="mx-2.5 my-2 border-t border-line" />
            )}
            {projects.map((project) => (
              <SidebarLink
                key={project.id}
                href={`/projects/${project.id}/board`}
                label={project.name}
                active={pathname.startsWith(`/projects/${project.id}`)}
                collapsed={collapsed}
                icon={
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: project.color }}
                  />
                }
                badge={project.key}
              />
            ))}
          </div>
        ) : null}
      </nav>

      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs
                     font-medium text-subtle transition-colors hover:bg-elevated hover:text-fg"
        >
          <IconChevronLeft
            className={`size-4 shrink-0 transition-transform duration-200 ${
              collapsed ? 'rotate-180' : ''
            }`}
          />
          {!collapsed ? <span>Collapse</span> : null}
        </button>
      </div>
    </aside>
  )
}

function SidebarLink({
  href,
  label,
  icon,
  active,
  collapsed,
  badge,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active: boolean
  collapsed: boolean
  badge?: string
}) {
  return (
    <Link
      href={href as never}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm
                  font-medium transition-colors duration-150
                  ${
                    active
                      ? 'bg-accent-soft text-accent'
                      : 'text-muted hover:bg-elevated hover:text-fg'
                  }`}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-1.5 -left-2 w-0.5 rounded-full bg-accent"
        />
      ) : null}
      <span className="grid size-4 shrink-0 place-items-center">{icon}</span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {badge ? (
            <span className="shrink-0 font-mono text-[10px] text-subtle">{badge}</span>
          ) : null}
        </>
      ) : null}
    </Link>
  )
}

/** Horizontal nav for narrow screens, where the rail is hidden. */
export function MobileNav() {
  const pathname = usePathname()

  const items: NavItem[] = [
    { href: '/', label: 'Projects', icon: <IconFolder className="size-4" /> },
    { href: '/my-tasks', label: 'Tasks', icon: <IconInbox className="size-4" /> },
    { href: '/workload', label: 'Workload', icon: <IconGauge className="size-4" /> },
    { href: '/reports', label: 'Reports', icon: <IconChart className="size-4" /> },
  ]

  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto border-b border-line bg-surface px-2 py-1.5 md:hidden"
      aria-label="Main"
    >
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href as never}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium
                        ${active ? 'bg-accent-soft text-accent' : 'text-muted'}`}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
