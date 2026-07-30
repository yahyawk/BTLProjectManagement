import { getMyProfile } from '@/lib/queries/profiles'

export const metadata = { title: 'Home · Teamflow' }

/**
 * M0 workspace home. Intentionally empty of product content — its job is to
 * prove three things: the session survives a refresh, RLS lets you read your
 * own profile, and the `handle_new_user` trigger created that profile row.
 *
 * M1 replaces this with project cards, open-task count and weekly utilization.
 */
export default async function HomePage() {
  const result = await getMyProfile()

  if (!result.ok) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load your profile: {result.error}
      </p>
    )
  }

  const profile = result.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Nothing here yet — workspaces and projects arrive in M1.
        </p>
      </div>

      {profile ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-medium text-slate-900">Your profile</h2>
          <p className="mt-1 text-xs text-slate-500">
            Created automatically by the <code>on_auth_user_created</code> trigger.
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <Row label="Name" value={profile.full_name || '—'} />
            <Row label="Email" value={profile.email ?? '—'} />
            <Row
              label="Weekly capacity"
              value={`${profile.weekly_capacity_hours} hours`}
            />
            <Row label="Timezone" value={profile.timezone} />
          </dl>
        </section>
      ) : (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-medium text-amber-900">No profile row</h2>
          <p className="mt-1 text-sm text-amber-800">
            You are signed in, but <code>public.profiles</code> has no row for this
            user. That means the <code>on_auth_user_created</code> trigger did not
            fire — check it in the Supabase SQL editor.
          </p>
        </section>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  )
}
