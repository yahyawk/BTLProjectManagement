import Link from 'next/link'

import { IconFolder } from '@/components/ui/icons'

export default function AppNotFound() {
  return (
    <div className="surface-card mx-auto max-w-md animate-rise p-8 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-elevated text-subtle">
        <IconFolder className="size-5" />
      </span>
      <h1 className="mt-4 text-base font-semibold text-fg">Not found</h1>
      <p className="mt-1 text-sm text-muted">
        This project or task does not exist — or it belongs to a workspace you are not a
        member of. Those look the same on purpose.
      </p>
      <Link
        href="/"
        className="mt-5 inline-block rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg
                   transition-all hover:brightness-110 active:scale-[0.98]"
      >
        Back to projects
      </Link>
    </div>
  )
}
