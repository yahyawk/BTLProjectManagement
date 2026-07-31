import Link from 'next/link'

import { AddMemberForm, CreateProjectForm, CreateWorkspaceForm } from './forms'
import { Avatar } from '@/components/ui/badge'
import { IconFolder } from '@/components/ui/icons'
import { EmptyState, PageHeader, Panel } from '@/components/ui/panel'
import { listProjects } from '@/lib/queries/projects'
import { listMyWorkspaces, listWorkspaceMembers } from '@/lib/queries/workspaces'
import type { Project, Workspace } from '@/lib/types'

export const metadata = { title: 'Projects' }

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string }>
}) {
  const { ws } = await searchParams
  const workspacesResult = await listMyWorkspaces()

  if (!workspacesResult.ok) return <ErrorPanel message={workspacesResult.error} />

  const workspaces = workspacesResult.data

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-fg">
            Create your workspace
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            A workspace is the boundary for your team — its members, projects and reporting
            all live inside it.
          </p>
        </div>
        <Panel title="New workspace">
          <CreateWorkspaceForm />
        </Panel>
      </div>
    )
  }

  const active = workspaces.find((w) => w.id === ws) ?? workspaces[0]

  const [projectsResult, membersResult] = await Promise.all([
    listProjects(active.id),
    listWorkspaceMembers(active.id),
  ])

  if (!projectsResult.ok) return <ErrorPanel message={projectsResult.error} />
  if (!membersResult.ok) return <ErrorPanel message={membersResult.error} />

  const projects = projectsResult.data
  const members = membersResult.data

  return (
    <div className="space-y-6">
      <PageHeader
        title={active.name}
        subtitle={
          <>
            {projects.length} {projects.length === 1 ? 'project' : 'projects'} ·{' '}
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </>
        }
        actions={
          workspaces.length > 1 ? (
            <WorkspaceSwitcher all={workspaces} active={active} />
          ) : undefined
        }
      />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle">Projects</h2>
        {projects.length === 0 ? (
          <EmptyState
            icon={<IconFolder className="size-5" />}
            title="No projects yet"
            description="Create one below — it gets four board columns automatically."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="New project"
          description="Backlog, In Progress, In Review and Done are seeded by the database."
        >
          <CreateProjectForm workspaceId={active.id} />
        </Panel>

        <Panel
          title="Members"
          description="Everyone here can see every project in this workspace."
        >
          <ul className="mb-5 space-y-1">
            {members.map((member) => (
              <li
                key={member.user_id}
                className="flex items-center gap-2.5 rounded-lg px-1 py-1.5"
              >
                <Avatar name={member.full_name} seed={member.user_id} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{member.full_name}</p>
                  <p className="truncate text-xs text-subtle">{member.email ?? '—'}</p>
                </div>
                <span className="shrink-0 rounded-md bg-elevated px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted ring-1 ring-inset ring-line">
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line pt-4">
            <AddMemberForm workspaceId={active.id} />
          </div>
        </Panel>
      </div>
    </div>
  )
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <Link
        href={`/projects/${project.id}/board` as never}
        className="group relative block h-full overflow-hidden rounded-xl border border-line
                   bg-surface p-4 shadow-card transition-all duration-200
                   hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop"
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 opacity-70 transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: project.color }}
        />
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 rounded-[3px]"
            style={{ backgroundColor: project.color }}
          />
          <span className="rounded-md bg-elevated px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted ring-1 ring-inset ring-line">
            {project.key}
          </span>
          <span className="ml-auto text-[11px] capitalize text-subtle">
            {project.state.replace('_', ' ')}
          </span>
        </div>

        <p className="mt-2.5 font-medium text-fg">{project.name}</p>
        {project.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted">{project.description}</p>
        ) : null}

        <p className="mt-3 flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
          Open board
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </p>
      </Link>
    </li>
  )
}

function WorkspaceSwitcher({ all, active }: { all: Workspace[]; active: Workspace }) {
  return (
    <nav className="flex flex-wrap gap-1 rounded-lg bg-elevated p-0.5" aria-label="Switch workspace">
      {all.map((workspace) => (
        <Link
          key={workspace.id}
          href={{ pathname: '/', query: { ws: workspace.id } }}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            workspace.id === active.id
              ? 'bg-surface text-fg shadow-card'
              : 'text-muted hover:text-fg'
          }`}
        >
          {workspace.name}
        </Link>
      ))}
    </nav>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
      Something went wrong: {message}
    </p>
  )
}
