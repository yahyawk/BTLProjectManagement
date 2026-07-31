import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getProject } from '@/lib/queries/projects'

function ProjectTab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href as never}
      className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium
                 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
    >
      {children}
    </Link>
  )
}

/**
 * `modal` is a parallel route slot. Navigating to a task from the board is
 * intercepted into it (see @modal/(.)tasks/[ref]) so the detail opens over the
 * board; a hard load of the same URL falls through to the real page instead.
 */
export default async function ProjectLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode
  modal: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const result = await getProject(projectId)

  if (!result.ok) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load this project: {result.error}
      </p>
    )
  }

  // RLS returns null for a project in a workspace you are not a member of, so
  // "not found" and "not yours" are deliberately indistinguishable here.
  if (!result.data) notFound()

  const project = result.data

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="size-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {project.name}
            </h1>
            <p className="text-xs text-slate-500">
              <span className="font-mono">{project.key}</span> ·{' '}
              {project.task_counter} {project.task_counter === 1 ? 'task' : 'tasks'} created
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          All projects
        </Link>
      </header>

      <nav className="flex gap-1 border-b border-slate-200" aria-label="Project views">
        <ProjectTab href={`/projects/${projectId}/board`}>Board</ProjectTab>
        <ProjectTab href={`/projects/${projectId}/list`}>List</ProjectTab>
        <ProjectTab href={`/projects/${projectId}/recurring`}>Recurring</ProjectTab>
        <ProjectTab href={`/projects/${projectId}/settings`}>Settings</ProjectTab>
      </nav>

      {children}
      {modal}
    </div>
  )
}
