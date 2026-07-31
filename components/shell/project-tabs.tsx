'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { IconBoard, IconList, IconRepeat, IconSettings } from '@/components/ui/icons'

/**
 * Segmented tabs with an underline that tracks the active route. Client-side
 * only because it needs `usePathname` — everything it links to stays a server
 * component.
 */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname()

  const tabs = [
    { slug: 'board', label: 'Board', icon: <IconBoard className="size-3.5" /> },
    { slug: 'list', label: 'List', icon: <IconList className="size-3.5" /> },
    { slug: 'recurring', label: 'Recurring', icon: <IconRepeat className="size-3.5" /> },
    { slug: 'settings', label: 'Settings', icon: <IconSettings className="size-3.5" /> },
  ]

  return (
    <nav className="flex gap-0.5 overflow-x-auto border-b border-line" aria-label="Project views">
      {tabs.map((tab) => {
        const href = `/projects/${projectId}/${tab.slug}`
        const active = pathname.startsWith(href)

        return (
          <Link
            key={tab.slug}
            href={href as never}
            aria-current={active ? 'page' : undefined}
            className={`relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm
                        font-medium transition-colors duration-150
                        ${active ? 'text-fg' : 'text-muted hover:text-fg'}`}
          >
            {tab.icon}
            {tab.label}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent"
              />
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
