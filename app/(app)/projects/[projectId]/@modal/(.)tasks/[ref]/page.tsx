import { TaskDetail } from '@/components/task/task-detail'
import { TaskModal } from '@/components/task/task-modal'

/**
 * Intercepts /projects/[projectId]/tasks/[ref] when it is reached by an in-app
 * navigation (i.e. clicking a card on the board), rendering the detail as a
 * modal over the board. A hard load of the same URL bypasses this and renders
 * the standalone page — so the link is genuinely deep-linkable either way.
 */
export default async function InterceptedTaskPage({
  params,
}: {
  params: Promise<{ projectId: string; ref: string }>
}) {
  const { projectId, ref } = await params

  return (
    <TaskModal>
      <TaskDetail projectId={projectId} taskRef={decodeURIComponent(ref)} />
    </TaskModal>
  )
}
