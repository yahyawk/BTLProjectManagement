'use client'

import { useActionState } from 'react'

import { Field, FormError, SubmitButton } from '@/components/ui/field'
import { Notice } from '@/components/ui/panel'
import type { Profile } from '@/lib/types'
import { updateProfileAction, type ProfileFormState } from './actions'

const TIMEZONES = [
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
]

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    {},
  )

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.error} />
      <Notice message={state.notice} />

      <Field
        label="Full name"
        name="fullName"
        type="text"
        defaultValue={profile.full_name}
        required
        errors={state.fieldErrors?.fullName}
      />
      <Field
        label="Job title"
        name="jobTitle"
        type="text"
        placeholder="Operations lead"
        defaultValue={profile.job_title ?? ''}
        errors={state.fieldErrors?.jobTitle}
      />

      <div>
        <Field
          label="Weekly capacity (hours)"
          name="weeklyCapacityHours"
          type="number"
          min={0}
          max={168}
          step="0.5"
          defaultValue={profile.weekly_capacity_hours}
          required
          errors={state.fieldErrors?.weeklyCapacityHours}
        />
        <p className="mt-1 text-xs text-slate-500">
          The denominator for every utilisation figure on the Workload view. Part-timers
          should be below 40.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="timezone" className="block text-sm font-medium text-slate-700">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={profile.timezone}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm
                     focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          {(TIMEZONES.includes(profile.timezone)
            ? TIMEZONES
            : [profile.timezone, ...TIMEZONES]
          ).map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton>Save profile</SubmitButton>
    </form>
  )
}
