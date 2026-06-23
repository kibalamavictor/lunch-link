import { NextResponse, type NextRequest } from "next/server";

import { decodeAccessTokenClaims, homePathForRole, LOGIN_PATH } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

/**
 * Minimal server-side login. Accepts a form post (email, password), signs in
 * via Supabase (which sets the session cookies), then redirects to the role
 * home (or /register when the account is not yet provisioned). UI is separate.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  const url = request.nextUrl.clone();
  url.search = "";

  if (error || !data.session) {
    url.pathname = LOGIN_PATH;
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, { status: 303 });
  }

  const claims = decodeAccessTokenClaims(data.session.access_token);
  url.pathname = homePathForRole(claims.user_role);
  return NextResponse.redirect(url, { status: 303 });
}
