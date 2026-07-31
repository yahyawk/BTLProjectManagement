import { IconLogo } from '@/components/ui/icons'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 opacity-60" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm animate-rise">
        <div className="mb-8 flex flex-col items-center text-center">
          <IconLogo className="size-11" />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-fg">
            BTL Project Management
          </h1>
          <p className="mt-1.5 max-w-xs text-sm text-muted">
            See how much of your team&apos;s capacity unplanned work is eating — and who is
            over capacity this week.
          </p>
        </div>

        <div className="surface-card p-6 shadow-pop">{children}</div>

        <p className="mt-6 text-center text-xs text-subtle">
          Every task is either recurring or ad-hoc. That distinction is the whole point.
        </p>
      </div>
    </main>
  )
}
