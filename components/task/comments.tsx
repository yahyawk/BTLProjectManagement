'use client'

import { useActionState, useRef } from 'react'

import { FormError } from '@/components/ui/field'
import {
  addCommentAction,
  deleteCommentAction,
  type TaskFormState,
} from '@/app/(app)/projects/[projectId]/actions'
import { formatTimestamp } from '@/lib/dates'
import type { CommentWithAuthor } from '@/lib/queries/comments'

export function Comments({
  projectId,
  taskId,
  comments,
  currentUserId,
}: {
  projectId: string
  taskId: string
  comments: CommentWithAuthor[]
  currentUserId: string
}) {
  const [state, formAction] = useActionState<TaskFormState, FormData>(addCommentAction, {})
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">
        Comments {comments.length > 0 ? `(${comments.length})` : ''}
      </h3>

      {comments.length > 0 ? (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl border border-line bg-elevated p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-fg">
                  {comment.author_name}
                </span>
                <span className="text-xs text-subtle">
                  {formatTimestamp(comment.created_at)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{comment.body}</p>
              {comment.author_id === currentUserId ? (
                <form action={deleteCommentAction} className="mt-1">
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="commentId" value={comment.id} />
                  <button
                    type="submit"
                    className="text-xs text-subtle hover:text-danger hover:underline"
                  >
                    Delete
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-subtle">No comments yet.</p>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData)
          formRef.current?.reset()
        }}
        className="space-y-2"
      >
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="taskId" value={taskId} />
        <textarea
          name="body"
          rows={2}
          required
          placeholder="Add a comment"
          className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm
                     focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
        />
        <FormError message={state.error} />
        <button
          type="submit"
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-fg"
        >
          Comment
        </button>
      </form>
    </section>
  )
}
