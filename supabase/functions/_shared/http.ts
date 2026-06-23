/**
 * Shared HTTP utilities for LunchLink Edge Functions.
 *
 * Envelope shapes match `@lunchlink/types` (`ApiSuccessEnvelope` /
 * `ApiErrorEnvelope`): success is `{ data, meta }`, error is
 * `{ error: { code, message, details? } }` (NO `meta`). Every response —
 * success or error — carries an `x-request-id` header.
 */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
};

export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/** Success envelope: { data, meta: { request_id, timestamp } } */
export function successResponse<T>(data: T, requestId: string, status = 200): Response {
  return jsonResponse(
    { data, meta: { request_id: requestId, timestamp: new Date().toISOString() } },
    status,
    { "x-request-id": requestId },
  );
}

export interface ErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * code -> HTTP status. Mapping lives ONLY here; codes are never renamed.
 * Includes both the HTTP-contract codes (api-specification.md §1.7) and the
 * raw codes the Postgres functions raise/return verbatim (013_functions.sql).
 */
export const ERROR_STATUS: Record<string, number> = {
  // --- HTTP-contract codes (api-specification.md §1.7) ---
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_VERIFIED: 403,
  NOT_FOUND: 404,
  QR_EXPIRED: 409,
  QR_ALREADY_USED: 409,
  VALIDATION_SESSION_EXPIRED: 409,
  PAYMENT_EXPIRED: 409,
  PAYOUT_PERIOD_LOCKED: 409,
  WALLET_FROZEN: 422,
  INSUFFICIENT_BALANCE: 422,
  DAILY_LIMIT_REACHED: 422,
  COOLDOWN_ACTIVE: 422,
  RESTAURANT_CLOSED: 422,
  SAUCE_UNAVAILABLE: 422,
  RECONCILIATION_BLOCKED: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  // --- Verbatim codes raised/returned by Postgres functions (013_functions.sql) ---
  WALLET_NOT_FOUND: 404,
  STUDENT_NOT_FOUND: 404,
  PHOTO_NOT_APPROVED: 403,
  ACCOUNT_NOT_ACTIVE: 403,
  INSUFFICIENT_SWIPES: 422,
  INSUFFICIENT_DINING_PLUS: 422,
  INSUFFICIENT_DINING_CASH: 422,
  DAILY_LIMIT_EXCEEDED: 422,
};

export function statusForCode(code: string): number {
  return ERROR_STATUS[code] ?? 500;
}

/** Error envelope: { error: { code, message, details? } } — no meta. */
export function errorResponse(
  err: ErrorBody,
  requestId: string,
  statusOverride?: number,
): Response {
  const status = statusOverride ?? statusForCode(err.code);
  const error: ErrorBody = { code: err.code, message: err.message };
  if (err.details) error.details = err.details;
  return jsonResponse({ error }, status, { "x-request-id": requestId });
}

/**
 * Translate a thrown error (incl. Postgres/PostgREST RPC errors) into an
 * ErrorBody, surfacing the DB-raised code VERBATIM when it is one we know.
 * `RAISE EXCEPTION 'INSUFFICIENT_SWIPES'` surfaces as `error.message`.
 */
export function toErrorBody(error: unknown): ErrorBody {
  const raw =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message ?? "").trim()
      : String(error ?? "").trim();

  if (raw && Object.prototype.hasOwnProperty.call(ERROR_STATUS, raw)) {
    return { code: raw, message: raw };
  }
  return { code: "INTERNAL", message: raw || "Unexpected error" };
}
