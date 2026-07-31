'use client'

import { useEffect, useState } from 'react'

import { IconMoon, IconSun } from './icons'

type Theme = 'light' | 'dark'

/**
 * Flips `data-theme` on <html> and remembers the choice.
 *
 * The initial value is applied by an inline script in the root layout, before
 * first paint — this component only mirrors it, so there is no flash and no
 * hydration mismatch (it renders nothing until mounted).
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    const current = document.documentElement.dataset.theme
    setTheme(current === 'dark' ? 'dark' : 'light')
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('btl-theme', next)
    } catch {
      // Private mode — the toggle still works for this session.
    }
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="grid size-8 place-items-center rounded-lg text-muted transition-colors
                 hover:bg-elevated hover:text-fg"
    >
      {theme === null ? (
        <span className="size-4" />
      ) : theme === 'dark' ? (
        <IconSun className="size-4" />
      ) : (
        <IconMoon className="size-4" />
      )}
    </button>
  )
}
