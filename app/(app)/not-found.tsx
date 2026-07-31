import Link from 'next/link'

export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
      <h1 className="text-base font-semibold text-slate-900">Not found</h1>
      <p className="mt-1 text-sm text-slate-600">
        This project or task does not exist — or it belongs to a workspace you are not a
        member of. Those look the same on purpose.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Back to projects
      </Link>
    </div>
  )
}
