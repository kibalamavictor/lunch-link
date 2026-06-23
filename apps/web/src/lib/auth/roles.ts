import type { UserRole } from "@lunchlink/types";

/**
 * Route-group buckets. Role → group mapping drives middleware protection.
 * Route groups `(public)/(student)/(restaurant)/(admin)` organize the app;
 * the URL prefixes below are what middleware actually keys off.
 */
export type RouteGroup = "public" | "student" | "restaurant" | "admin";
export type ProtectedGroup = Exclude<RouteGroup, "public">;

export const LOGIN_PATH = "/login";
export const REGISTER_PATH = "/register";

/** JWT claims injected by the custom_access_token_hook (see migration 018). */
export interface LunchLinkClaims {
  user_role?: UserRole;
  provisioned?: boolean;
  student_id?: string;
  university_id?: string;
  restaurant_id?: string;
}

/** Protected URL prefixes → the group (role bucket) allowed to access them. */
const PROTECTED_PREFIXES: ReadonlyArray<{ prefix: string; group: ProtectedGroup }> = [
  { prefix: "/student", group: "student" },
  { prefix: "/restaurant", group: "restaurant" },
  { prefix: "/admin", group: "admin" },
];

export function groupForRole(role: UserRole | null | undefined): ProtectedGroup | null {
  switch (role) {
    case "student":
      return "student";
    case "restaurant_staff":
    case "restaurant_manager":
      return "restaurant";
    case "admin":
    case "university_admin":
      return "admin";
    default:
      return null;
  }
}

export function homePathForRole(role: UserRole | null | undefined): string {
  switch (groupForRole(role)) {
    case "student":
      return "/student";
    case "restaurant":
      return "/restaurant";
    case "admin":
      return "/admin";
    default:
      return REGISTER_PATH;
  }
}

export function requiredGroupForPath(pathname: string): ProtectedGroup | null {
  const match = PROTECTED_PREFIXES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return match ? match.group : null;
}

/** Paths reachable without authentication. */
export function isPublicPath(pathname: string): boolean {
  return pathname === "/" || pathname === LOGIN_PATH || pathname.startsWith("/auth/");
}

/**
 * Decode (without verifying) the JWT payload to read hook-injected claims.
 * Routing/UX only — real authorization is enforced by RLS + the Edge middleware.
 */
export function decodeAccessTokenClaims(token: string): LunchLinkClaims {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as LunchLinkClaims;
  } catch {
    return {};
  }
}

export function isProvisioned(claims: LunchLinkClaims): boolean {
  return claims.provisioned === true && Boolean(claims.user_role);
}
