import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Auth routes are
     * included on purpose — signed-in users get bounced off /login.
     *
     * `api/cron` is excluded because it has no session to gate on: Vercel Cron
     * authenticates with `Authorization: Bearer $CRON_SECRET`, not a cookie, so
     * the cookie check would redirect it to /login and the route's own
     * fail-closed secret check would never run.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
