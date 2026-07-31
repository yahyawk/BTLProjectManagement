'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Uses the native <dialog> element so focus trapping, Esc-to-close and the
 * top-layer backdrop come from the platform instead of hand-rolled JS — which
 * is what let us skip a headless-UI dependency at M2.
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
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-slate-200
                 bg-white p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="max-h-[80vh] overflow-y-auto p-6">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="float-right -mt-1 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>
        {children}
      </div>
    </dialog>
  )
}
