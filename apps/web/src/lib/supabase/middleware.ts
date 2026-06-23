import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { decodeAccessTokenClaims, type LunchLinkClaims } from "@/lib/auth/roles";

export interface SessionResult {
  response: NextResponse;
  isAuthenticated: boolean;
  claims: LunchLinkClaims;
}

/**
 * Refresh the Supabase session (rotating cookies) and return the caller's
 * hook-injected claims. Runs in the Edge runtime, so the public env vars are
 * read as literal `process.env.NEXT_PUBLIC_*` references (required for Next's
 * build-time inlining — `@lunchlink/env` is used everywhere server-side).
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Validate the session with the auth server before trusting any claim.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let claims: LunchLinkClaims = {};
  if (user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      claims = decodeAccessTokenClaims(session.access_token);
    }
  }

  return { response, isAuthenticated: Boolean(user), claims };
}
