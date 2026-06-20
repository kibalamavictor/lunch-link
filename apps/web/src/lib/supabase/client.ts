import { createBrowserClient } from "@supabase/ssr";

import { parseClientEnv } from "@lunchlink/env/client";

/** Browser Supabase client factory — auth wiring in Sprint 1 */
export function createClient() {
  const env = parseClientEnv();

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
