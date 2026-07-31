import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LabelsPanel } from '@/components/board/labels-panel'
import { ColumnsEditor, ProjectDetailsForm } from '@/components/settings/project-settings'
import { Panel } from '@/components/ui/panel'
import { listLabels } from '@/lib/queries/labels'
import { canWriteProject, getProject } from '@/lib/queries/projects'
import { listStatuses } from '@/lib/queries/statuses'

export const metadata = { title: 'Settings · Teamflow' }

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  const [projectResult, statusesResult, labelsResult, canWrite] = await Promise.all([
    getProject(projectId),
    listStatuses(projectId),
    listLabels(projectId),
    canWriteProject(projectId),
  ])

  if (!projectResult.ok) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load settings: {projectResult.error}
      </p>
    )
  }
  if (!projectResult.data) notFound()

  if (!canWrite) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        You have view-only access to this project, so its settings cannot be changed.
      </p>
    )
  }

  const project = projectResult.data
  const statuses = statusesResult.ok ? statusesResult.data : []
  const labels = labelsResult.ok ? labelsResult.data : []

  return (
    <div className="max-w-3xl space-y-6">
      <Panel title="Project" description="Name, key, description and state.">
        <ProjectDetailsForm project={project} />
      </Panel>

      <Panel
        title="Board columns"
        description="Add, rename, reorder and set WIP limits. These are the columns the board renders."
      >
        <ColumnsEditor projectId={projectId} statuses={statuses} />
      </Panel>

      <LabelsPanel projectId={projectId} labels={labels} />

      <Panel
        title="Members"
        description="Access is granted at the workspace level, so everyone in the workspace can see this project."
      >
        <p className="text-sm text-slate-600">
          Add or remove people from the{' '}
          <Link href="/" className="text-indigo-600 hover:underline">
            workspace home
          </Link>
          . Per-project narrowing exists in the schema (<code>project_members</code>) but is
          not used by the MVP — a project with no rows there is visible to the whole
          workspace, which is the only mode the app runs in.
        </p>
      </Panel>
    </div>
  )
}
