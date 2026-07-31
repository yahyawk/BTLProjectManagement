'use server'

import { revalidatePath } from 'next/cache'

import { updateMyProfile } from '@/lib/queries/profiles'

export type ProfileFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  notice?: string
}

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const result = await updateMyProfile({
    fullName: formData.get('fullName'),
    jobTitle: formData.get('jobTitle') ?? '',
    weeklyCapacityHours: formData.get('weeklyCapacityHours'),
    timezone: formData.get('timezone'),
  })

  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors }

  // Capacity is the denominator of every utilisation figure, so the whole app
  // is stale after this, not just the profile page.
  revalidatePath('/', 'layout')

  return {
    notice: `Saved. Your capacity is now ${result.data.weekly_capacity_hours}h per week.`,
  }
}
