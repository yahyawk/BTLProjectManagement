export function Panel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-medium text-slate-900">{title}</h2>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function Notice({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p
      role="status"
      className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
    >
      {message}
    </p>
  )
}
