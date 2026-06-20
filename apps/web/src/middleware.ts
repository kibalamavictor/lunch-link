import { type NextRequest, NextResponse } from "next/server";

/**
 * Auth + role routing middleware skeleton.
 * Portal route protection is implemented in Sprint 1 (M1).
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and health endpoints
     */
    "/((?!_next/static|_next/image|favicon.ico|api/health).*)",
  ],
};
