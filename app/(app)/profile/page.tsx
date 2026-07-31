import { Panel } from '@/components/ui/panel'
import { getMyProfile } from '@/lib/queries/profiles'
import { ProfileForm } from './profile-form'

export const metadata = { title: 'Profile · Teamflow' }

export default async function ProfilePage() {
  const result = await getMyProfile()

  if (!result.ok) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load your profile: {result.error}
      </p>
    )
  }

  if (!result.data) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You are signed in, but <code>public.profiles</code> has no row for this user — the{' '}
        <code>on_auth_user_created</code> trigger did not fire.
      </p>
    )
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Your profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Only you can edit this — <code>profiles_update</code> is scoped to your own row.
        </p>
      </div>
      <Panel title="Details">
        <ProfileForm profile={result.data} />
      </Panel>
    </div>
  )
}
