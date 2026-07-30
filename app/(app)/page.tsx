import Link from 'next/link'

import { Panel } from '@/components/ui/panel'
import { listProjects } from '@/lib/queries/projects'
import { listMyWorkspaces, listWorkspaceMembers } from '@/lib/queries/workspaces'
import type { Project, Workspace } from '@/lib/types'
import { AddMemberForm, CreateProjectForm, CreateWorkspaceForm } from './forms'

export const metadata = { title: 'Home · Teamflow' }

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string }>
}) {
  const { ws } = await searchParams
  const workspacesResult = await listMyWorkspaces()

  if (!workspacesResult.ok) {
    return <ErrorPanel message={workspacesResult.error} />
  }

  const workspaces = workspacesResult.data

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Create your workspace
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            A workspace is the boundary for your team — its members, projects and
            reporting all live inside it.
          </p>
        </div>
        <Panel title="New workspace">
          <CreateWorkspaceForm />
        </Panel>
      </div>
    )
  }

  // ?ws= lets someone in more than one workspace switch; default to the oldest.
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
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {active.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'} ·{' '}
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        {workspaces.length > 1 ? <WorkspaceSwitcher all={workspaces} active={active} /> : null}
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-slate-900">Projects</h2>
        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No projects yet. Create one below and it gets four board columns
            automatically.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="New project"
          description="Four columns — Backlog, In Progress, In Review, Done — are seeded by the database."
        >
          <CreateProjectForm workspaceId={active.id} />
        </Panel>

        <Panel title="Members" description="Everyone here can see every project in this workspace.">
          <ul className="mb-5 divide-y divide-slate-100 text-sm">
            {members.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{member.full_name}</p>
                  <p className="truncate text-xs text-slate-500">{member.email ?? '—'}</p>
                </div>
                <span className="ml-3 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
          <AddMemberForm workspaceId={active.id} />
        </Panel>
      </div>
    </div>
  )
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-600">
          {project.key}
        </span>
      </div>
      <p className="mt-2 font-medium text-slate-900">{project.name}</p>
      <p className="mt-0.5 text-xs capitalize text-slate-500">
        {project.state.replace('_', ' ')}
      </p>
      <p className="mt-3 text-xs text-slate-400">Board arrives in M2</p>
    </li>
  )
}

function WorkspaceSwitcher({
  all,
  active,
}: {
  all: Workspace[]
  active: Workspace
}) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Switch workspace">
      {all.map((workspace) => (
        <Link
          key={workspace.id}
          href={{ pathname: '/', query: { ws: workspace.id } }}
          className={
            workspace.id === active.id
              ? 'rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
              : 'rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100'
          }
        >
          {workspace.name}
        </Link>
      ))}
    </nav>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      Something went wrong: {message}
    </p>
  )
}
