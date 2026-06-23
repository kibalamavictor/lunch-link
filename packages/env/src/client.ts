import { z } from "zod";

/**
 * Client-safe environment variables (NEXT_PUBLIC_*).
 * Validated at build time via apps/web next.config.ts
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

/** Used in non-production when vars are not yet configured */
export const clientEnvSchemaLenient = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export const clientEnvDevDefaults = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "dev-anon-key-not-configured",
} as const satisfies Pick<
  ClientEnv,
  "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
>;

function readClientEnvInput(env: Record<string, string | undefined>) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  };
}

function applyClientEnvDefaults(
  parsed: z.infer<typeof clientEnvSchemaLenient>,
): ClientEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL:
      parsed.NEXT_PUBLIC_SUPABASE_URL ?? clientEnvDevDefaults.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      clientEnvDevDefaults.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: parsed.NEXT_PUBLIC_APP_URL,
  };
}

/**
 * True when Next.js is loading next.config during `next lint`.
 * next.config.ts is evaluated for lint, so env validation must be skipped here.
 */
export function isNextConfigLintContext(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.SKIP_ENV_VALIDATION === "true") return true;
  if (env.npm_lifecycle_event === "lint") return true;
  return process.argv.includes("lint");
}

/**
 * Called from apps/web/next.config.ts at module load.
 * Skips validation during lint; enforces schema on production builds.
 */
export function validateClientEnvForNextConfig(
  env: Record<string, string | undefined> = process.env,
): void {
  if (isNextConfigLintContext(env)) return;

  if (env.NODE_ENV === "production") {
    const result = clientEnvSchema.safeParse(readClientEnvInput(env));
    if (!result.success) {
      throw new Error(
        [
          "Missing required NEXT_PUBLIC_* environment variables for production build.",
          "Create apps/web/.env.local (see apps/web/.env.example) or export them in your shell.",
          "If you had a backup, restore it: cp apps/web/.env.local.save apps/web/.env.local",
          result.error.message,
        ].join("\n"),
      );
    }
    return;
  }

  clientEnvSchemaLenient.parse(readClientEnvInput(env));
}

/** Runtime parser — strict in production, dev defaults otherwise */
export function parseClientEnv(
  env: Record<string, string | undefined> = process.env,
): ClientEnv {
  const input = readClientEnvInput(env);

  if (env.NODE_ENV === "production") {
    return clientEnvSchema.parse(input);
  }

  return applyClientEnvDefaults(clientEnvSchemaLenient.parse(input));
}
