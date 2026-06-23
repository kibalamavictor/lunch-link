/**
 * Shared auth-context resolution for LunchLink Edge Functions.
 *
 * Resolves the caller's role + scoped ids authoritatively via the Postgres
 * `current_*` helpers (013_functions.sql), executed under the caller's JWT.
 * These run SECURITY DEFINER against `auth.uid()`, so the result cannot be
 * spoofed by client-supplied claims.
 */

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type AppRole =
  | "student"
  | "restaurant_staff"
  | "restaurant_manager"
  | "admin"
  | "university_admin";

export interface AuthContext {
  userId: string | null;
  role: AppRole | null;
  studentId: string | null;
  universityId: string | null;
  restaurantId: string | null;
  /** true when the user has a provisioned profile (role resolved). */
  provisioned: boolean;
  /** request-scoped client bound to the caller's JWT. */
  client: SupabaseClient;
}

/** Supabase client bound to the caller's Authorization header (RLS applies). */
export function clientFromRequest(req: Request): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolve role + scoped ids via the current_* helpers. */
export async function resolveAuthContext(req: Request): Promise<AuthContext> {
  const client = clientFromRequest(req);

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      userId: null,
      role: null,
      studentId: null,
      universityId: null,
      restaurantId: null,
      provisioned: false,
      client,
    };
  }

  const [roleRes, studentRes, universityRes, restaurantRes] = await Promise.all([
    client.rpc("current_user_role"),
    client.rpc("current_student_id"),
    client.rpc("current_university_id"),
    client.rpc("current_restaurant_id"),
  ]);

  const role = (roleRes.data ?? null) as AppRole | null;

  return {
    userId: user.id,
    role,
    studentId: (studentRes.data ?? null) as string | null,
    universityId: (universityRes.data ?? null) as string | null,
    restaurantId: (restaurantRes.data ?? null) as string | null,
    provisioned: role !== null,
    client,
  };
}

/** Throws an Error whose message is a code in ERROR_STATUS (mapped by the caller). */
export function requireRoles(ctx: AuthContext, allowed: AppRole[]): void {
  if (!ctx.userId) throw new Error("UNAUTHENTICATED");
  if (!ctx.role || !allowed.includes(ctx.role)) throw new Error("FORBIDDEN");
}
