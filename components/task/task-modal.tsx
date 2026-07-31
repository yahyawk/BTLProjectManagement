'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { IconX } from '@/components/ui/icons'

/**
 * Uses the native <dialog> element so focus trapping, Esc-to-close and the
 * top-layer backdrop come from the platform instead of hand-rolled JS — which
 * is what let us skip a headless-UI dependency.
 */
export function TaskModal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const router = useRouter()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  function close() {
    router.back()
  }

  return (
    <dialog
      ref={ref}
      onClose={close}
      onClick={(event) => {
        // Clicks land on the dialog itself only when they hit the backdrop;
        // anything inside the content div stops at that element.
        if (event.target === ref.current) close()
      }}
      className="m-auto w-[min(42rem,calc(100vw-2rem))] animate-pop rounded-2xl border
                 border-line bg-surface p-0 text-fg shadow-pop"
    >
      <div className="relative max-h-[85vh] overflow-y-auto p-6">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-lg
                     text-subtle transition-colors hover:bg-elevated hover:text-fg"
        >
          <IconX className="size-4" />
        </button>
        {children}
      </div>
    </dialog>
  )
}
