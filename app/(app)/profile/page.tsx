import { Panel } from '@/components/ui/panel'
import { getMyProfile } from '@/lib/queries/profiles'
import { ProfileForm } from './profile-form'

export const metadata = { title: 'Profile · BTL' }

export default async function ProfilePage() {
  const result = await getMyProfile()

  if (!result.ok) {
    return (
      <p className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Could not load your profile: {result.error}
      </p>
    )
  }

  if (!result.data) {
    return (
      <p className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
        You are signed in, but <code>public.profiles</code> has no row for this user — the{' '}
        <code>on_auth_user_created</code> trigger did not fire.
      </p>
    )
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Your profile</h1>
        <p className="mt-1 text-sm text-subtle">
          Only you can edit this — <code>profiles_update</code> is scoped to your own row.
        </p>
      </div>
      <Panel title="Details">
        <ProfileForm profile={result.data} />
      </Panel>
    </div>
  )
}
