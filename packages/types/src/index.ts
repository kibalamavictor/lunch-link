/**
 * Shared domain types aligned with Technical Foundation v2 / Business Rules.
 *
 * Database row/enum types are generated from the live Postgres schema by
 * running `pnpm gen:types` at the repo root (requires the local Supabase
 * stack) into `./database.types.ts` and re-exported below. Use
 * `Tables<"...">`, `Enums<"...">`, `TablesInsert<"...">`, etc. for
 * schema-accurate types.
 */
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from "./database.types.js";
export { Constants } from "./database.types.js";

export const USER_ROLES = [
  "student",
  "restaurant_staff",
  "restaurant_manager",
  "admin",
  "university_admin",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const WALLET_TYPES = ["swipe", "dining_plus", "dining_cash"] as const;

export type WalletType = (typeof WALLET_TYPES)[number];

export const VERIFICATION_TIERS = ["registered", "verified", "sponsored"] as const;

export type VerificationTier = (typeof VERIFICATION_TIERS)[number];

/** Standard Edge Function / API success envelope */
export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: ApiMeta;
}

/** Standard Edge Function / API error envelope */
export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiMeta {
  request_id: string;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export function isApiError(
  response: ApiResponse<unknown>,
): response is ApiErrorEnvelope {
  return "error" in response;
}
