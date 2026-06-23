import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { parseClientEnv } from "@lunchlink/env/client";

/**
 * Server-side Supabase client for Server Components, Route Handlers, and Server
 * Actions (Node runtime). Auth wiring for Sprint 1 (Roadmap S1).
 */
export async function createClient() {
  const env = parseClientEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component where mutating cookies throws;
            // session refresh is handled by the middleware instead.
          }
        },
      },
    },
  );
}
