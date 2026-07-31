import Link from 'next/link'
import { redirect } from 'next/navigation'

import { MobileNav, Sidebar } from '@/components/shell/sidebar'
import { Avatar } from '@/components/ui/badge'
import { IconLogout } from '@/components/ui/icons'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { getMyProfile } from '@/lib/queries/profiles'
import { listProjects } from '@/lib/queries/projects'
import { listMyWorkspaces } from '@/lib/queries/workspaces'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '../(auth)/actions'

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

  // The rail lists the active workspace's projects. Failures here degrade to
  // an empty rail rather than taking the whole app down.
  const [workspacesResult, profileResult] = await Promise.all([
    listMyWorkspaces(),
    getMyProfile(),
  ])

  const workspaces = workspacesResult.ok ? workspacesResult.data : []
  const activeWorkspace = workspaces[0]
  const projectsResult = activeWorkspace ? await listProjects(activeWorkspace.id) : null
  const projects = projectsResult?.ok ? projectsResult.data : []

  const displayName = profileResult.ok && profileResult.data
    ? profileResult.data.full_name || user.email!
    : user.email!

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        workspaceName={activeWorkspace?.name ?? 'No workspace'}
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          key: p.key,
          color: p.color,
        }))}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3
                           border-b border-line bg-surface/85 px-4 backdrop-blur-md">
          <div className="min-w-0 md:hidden">
            <span className="text-sm font-semibold text-fg">BTL</span>
          </div>
          <div className="hidden md:block" />

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-elevated"
              title="Your profile"
            >
              <Avatar name={displayName} seed={user.id} size="sm" />
              <span className="hidden max-w-40 truncate text-xs font-medium text-muted sm:block">
                {displayName}
              </span>
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="grid size-8 place-items-center rounded-lg text-muted
                           transition-colors hover:bg-elevated hover:text-danger"
              >
                <IconLogout className="size-4" />
              </button>
            </form>
          </div>
        </header>

        <MobileNav />

        <main className="mx-auto w-full max-w-[1400px] flex-1 animate-fade px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
