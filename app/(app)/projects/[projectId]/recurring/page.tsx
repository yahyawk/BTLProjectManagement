import { TemplateForm } from '@/components/recurring/template-form'
import { TemplateList } from '@/components/recurring/template-list'
import { Panel } from '@/components/ui/panel'
import { canWriteProject } from '@/lib/queries/projects'
import { listTemplates } from '@/lib/queries/recurrence'
import { listProjectAssignees } from '@/lib/queries/workspaces'

export const metadata = { title: 'Recurring · Teamflow' }

export default async function RecurringPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  const [templatesResult, membersResult, canWrite] = await Promise.all([
    listTemplates(projectId),
    listProjectAssignees(projectId),
    canWriteProject(projectId),
  ])

  if (!templatesResult.ok) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load templates: {templatesResult.error}
      </p>
    )
  }

  const templates = templatesResult.data
  const members = membersResult.ok ? membersResult.data : []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-slate-900">Recurrence templates</h2>
        <p className="mt-1 text-sm text-slate-500">
          Blueprints that generate real tasks on a schedule. Every task they create is
          <span className="mx-1 rounded bg-recurring/15 px-1.5 py-0.5 text-xs font-medium text-recurring">
            recurring
          </span>
          — that is what makes regular load measurable against interrupts.
        </p>
      </div>

      <TemplateList projectId={projectId} templates={templates} canWrite={canWrite} />

      {canWrite ? (
        <div className="max-w-2xl">
          <Panel
            title="New template"
            description="The preview below uses the same function the generator does, so it cannot drift."
          >
            <TemplateForm projectId={projectId} members={members} />
          </Panel>
        </div>
      ) : null}
    </div>
  )
}
