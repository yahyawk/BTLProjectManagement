import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ProjectTabs } from '@/components/shell/project-tabs'
import { getProject } from '@/lib/queries/projects'

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
      <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Could not load this project: {result.error}
      </p>
    )
  }

  // RLS returns null for a project in a workspace you are not a member of, so
  // "not found" and "not yours" are deliberately indistinguishable here.
  if (!result.data) notFound()

  const project = result.data

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="size-8 shrink-0 rounded-lg"
            style={{ backgroundColor: project.color }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-fg">
                {project.name}
              </h1>
              <span className="shrink-0 rounded-md bg-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted ring-1 ring-inset ring-line">
                {project.key}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-subtle">
              {project.task_counter} {project.task_counter === 1 ? 'task' : 'tasks'} created
              {project.description ? ` · ${project.description}` : ''}
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium
                     text-muted transition-colors hover:bg-elevated hover:text-fg"
        >
          All projects
        </Link>
      </header>

      <ProjectTabs projectId={projectId} />

      {children}
      {modal}
    </div>
  )
}
