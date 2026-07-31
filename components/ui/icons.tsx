/**
 * Hand-rolled icon set.
 *
 * A library like lucide-react would need sign-off (CLAUDE.md §2) and would ship
 * ~1000 icons to deliver the dozen used here. These are inline SVG on a 24px
 * grid with `currentColor`, so they inherit text colour and theme for free.
 */
type IconProps = {
  className?: string
  strokeWidth?: number
}

function Svg({
  className = 'size-4',
  strokeWidth = 1.75,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconBoard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="5.5" height="16" rx="1.5" />
      <rect x="9.75" y="4" width="5.5" height="11" rx="1.5" />
      <rect x="16.5" y="4" width="4.5" height="14" rx="1.5" />
    </Svg>
  )
}

export function IconList(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function IconRepeat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 2.5 20.5 6 17 9.5" />
      <path d="M3.5 12V9a3 3 0 0 1 3-3h14" />
      <path d="M7 21.5 3.5 18 7 14.5" />
      <path d="M20.5 12v3a3 3 0 0 1-3 3h-14" />
    </Svg>
  )
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.34.4.62.73.79.3.16.63.24.96.24H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Svg>
  )
}

export function IconInbox(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 13h4l1.5 3h7L17 13h4" />
      <path d="M4.6 5.4 3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5l-1.6-7.6A2 2 0 0 0 17.45 4H6.55a2 2 0 0 0-1.95 1.4Z" />
    </Svg>
  )
}

export function IconGauge(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="m14.1 9.9 3.2-3.2" />
      <path d="M3.3 18a10 10 0 1 1 17.4 0" />
    </Svg>
  )
}

export function IconChart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <rect x="7" y="12" width="3" height="5" rx="1" />
      <rect x="12.5" y="8" width="3" height="9" rx="1" />
      <rect x="18" y="4.5" width="3" height="12.5" rx="1" />
    </Svg>
  )
}

export function IconFolder(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.7.9l.8 1.2a2 2 0 0 0 1.7.9H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </Svg>
  )
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Svg>
  )
}

export function IconX(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function IconChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 9 7 7 7-7" />
    </Svg>
  )
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m15 5-7 7 7 7" />
    </Svg>
  )
}

export function IconChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9 5 7 7-7 7" />
    </Svg>
  )
}

export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

export function IconAlert(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 2.7 19a1.5 1.5 0 0 0 1.3 2.2h16a1.5 1.5 0 0 0 1.3-2.2Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function IconUsers(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
      <circle cx="9" cy="7" r="3.5" />
      <path d="M22 20v-1.5a4 4 0 0 0-3-3.87" />
      <path d="M16.5 3.7a4 4 0 0 1 0 7.1" />
    </Svg>
  )
}

export function IconSun(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  )
}

export function IconMoon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </Svg>
  )
}

export function IconLogout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  )
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M5.5 7 6.5 20a1.5 1.5 0 0 0 1.5 1.4h8a1.5 1.5 0 0 0 1.5-1.4L18.5 7" />
      <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
    </Svg>
  )
}

export function IconTag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12.8V5a2 2 0 0 1 2-2h7.8a2 2 0 0 1 1.4.6l6.2 6.2a2 2 0 0 1 0 2.8l-7.8 7.8a2 2 0 0 1-2.8 0L3.6 14.2a2 2 0 0 1-.6-1.4Z" />
      <circle cx="8.5" cy="8.5" r="1.4" />
    </Svg>
  )
}

export function IconBolt(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 2 4 13.5h6.5L10 22l9.5-11.5H13Z" />
    </Svg>
  )
}

export function IconLogo({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <rect x="7" y="8" width="5" height="16" rx="2" fill="var(--accent-fg)" opacity="0.95" />
      <rect x="14" y="8" width="5" height="10" rx="2" fill="var(--accent-fg)" opacity="0.7" />
      <rect x="21" y="8" width="4" height="6" rx="2" fill="var(--accent-fg)" opacity="0.45" />
    </svg>
  )
}
