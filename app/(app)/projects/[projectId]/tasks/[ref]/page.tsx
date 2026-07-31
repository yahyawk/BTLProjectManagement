import Link from 'next/link'

import { TaskDetail } from '@/components/task/task-detail'

/** Standalone task page — what a hard load or a shared link renders. */
export default async function TaskPage({
  params,
}: {
  params: Promise<{ projectId: string; ref: string }>
}) {
  const { projectId, ref } = await params

  return (
    <div className="max-w-2xl space-y-4">
      <Link
        href={`/projects/${projectId}/board` as never}
        className="inline-block text-sm text-accent hover:underline"
      >
        ← Back to board
      </Link>
      <div className="rounded-xl border border-line bg-surface p-6">
        <TaskDetail projectId={projectId} taskRef={decodeURIComponent(ref)} />
      </div>
    </div>
  )
}
