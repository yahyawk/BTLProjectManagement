import Link from 'next/link'
import { redirect } from 'next/navigation'

import { signOutAction } from '../(auth)/actions'
import { createClient } from '@/lib/supabase/server'

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href as never}
      className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600
                 transition hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  )
}

/**
 * The protected shell. middleware.ts already redirects anonymous requests,
 * but this is the belt-and-braces check: never render app chrome without a
 * verified user, because middleware can be bypassed by a misconfigured matcher.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight text-slate-900">
              Teamflow
            </Link>
            <nav className="flex items-center gap-1" aria-label="Main">
              <NavLink href="/">Projects</NavLink>
              <NavLink href="/workload">Workload</NavLink>
              <NavLink href="/reports">Reports</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-sm text-slate-500 hover:text-slate-900 hover:underline"
            >
              {user.email}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm
                           font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
