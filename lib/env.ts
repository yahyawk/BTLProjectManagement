import { z } from 'zod'

/**
 * Env access is deliberately lazy — validated when a Supabase client is first
 * created, not at module load. That keeps `next build` green on a machine that
 * has no `.env.local`, while still failing loudly at runtime if Vercel is
 * missing a variable.
 *
 * Only NEXT_PUBLIC_* belongs here. The service-role key (M4) is read directly
 * inside the cron route so it can never be pulled into a client bundle.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

export type PublicEnv = z.infer<typeof publicEnvSchema>

export function publicEnv(): PublicEnv {
  // These must be referenced as full literals so Next can inline them.
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(
      `Supabase environment variables are missing or invalid: ${missing}. ` +
        'Set them in Vercel → Settings → Environment Variables, or in .env.local for local work.',
    )
  }

  return parsed.data
}
