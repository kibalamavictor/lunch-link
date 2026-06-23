import { NextResponse, type NextRequest } from "next/server";

import {
  groupForRole,
  homePathForRole,
  isProvisioned,
  isPublicPath,
  LOGIN_PATH,
  REGISTER_PATH,
  requiredGroupForPath,
} from "@/lib/auth/roles";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Role-based route protection over the (public)/(student)/(restaurant)/(admin)
 * groups. Authorization is also enforced server-side by RLS and the Edge
 * middleware; this layer is UX-level route gating.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, isAuthenticated, claims } = await updateSession(request);

  // Public routes (incl. /login and /auth/* handlers): always allowed.
  if (isPublicPath(pathname)) return response;

  // Everything below requires authentication.
  if (!isAuthenticated) {
    return redirectTo(request, LOGIN_PATH, response);
  }

  const provisioned = isProvisioned(claims);

  // Registration route: reachable by authenticated-but-unprovisioned users.
  if (pathname === REGISTER_PATH || pathname.startsWith(`${REGISTER_PATH}/`)) {
    return provisioned
      ? redirectTo(request, homePathForRole(claims.user_role), response)
      : response;
  }

  // Authenticated but no profile yet → must complete registration first.
  if (!provisioned) {
    return redirectTo(request, REGISTER_PATH, response);
  }

  // Role-group protection: a role may only enter its own group's routes.
  const requiredGroup = requiredGroupForPath(pathname);
  if (requiredGroup && groupForRole(claims.user_role) !== requiredGroup) {
    return redirectTo(request, homePathForRole(claims.user_role), response);
  }

  // [Verified-photo gate hook — intentionally NOT enforced here]
  // Photo verification (students.photo_status = 'approved') is enforced later
  // at the payment/QR/redeem endpoints via check_redemption_eligibility() and
  // the verified gate. See api-specification.md §3 and §5–§7.

  return response;
}

/** Redirect while preserving any session cookies refreshed by updateSession. */
function redirectTo(
  request: NextRequest,
  pathname: string,
  from: NextResponse,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next internals, the favicon, and /api/* (route
     * handlers do their own auth). /auth/* still runs through middleware and is
     * treated as public so login/logout are reachable.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
