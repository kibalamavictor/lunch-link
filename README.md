# LunchLink

University meal-plan platform for Uganda — monorepo engineering foundation (Sprint 0).

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Web:** Next.js 15 (App Router), React 19, Tailwind CSS
- **Database:** Supabase (PostgreSQL 15, Auth, Storage, Edge Functions)
- **Shared packages:** `@lunchlink/types`, `@lunchlink/env`, `@lunchlink/ui`

## Repository structure

```
apps/
  web/                  Next.js application (scaffold only — no UI pages in Sprint 0)
packages/
  types/                Shared TypeScript domain types
  env/                  Zod environment validation (client + server)
  ui/                   Design tokens, Tailwind preset, utilities
  eslint-config/        Shared ESLint flat config
  typescript-config/    Shared tsconfig bases
supabase/
  migrations/           Database schema (001–017)
  functions/            Edge Functions scaffold (health)
  seed.sql              Pilot reference data
```

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local database)
- Docker (required by Supabase local stack)

## Getting started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your Supabase project URL and anon key

# Start local Supabase (migrations + seed)
supabase start
supabase db reset

# Start Next.js dev server
pnpm dev
```

Health endpoints:

- Web: `GET http://localhost:3000/api/health`
- Edge Function: deploy `health` or invoke locally after `supabase functions serve`

## Scripts

| Command             | Description                   |
| ------------------- | ----------------------------- |
| `pnpm dev`          | Start all apps in development |
| `pnpm build`        | Build all packages and apps   |
| `pnpm lint`         | ESLint across the monorepo    |
| `pnpm typecheck`    | TypeScript check              |
| `pnpm format`       | Prettier write                |
| `pnpm format:check` | Prettier check (CI)           |

## Environment validation

Client env vars are validated at build time via `@lunchlink/env/client`:

- `NEXT_PUBLIC_SUPABASE_URL` (required)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)
- `NEXT_PUBLIC_APP_URL` (optional)

Server-only secrets are defined in `@lunchlink/env/server` for Sprint 1+.

## Database

Migrations follow [Technical Foundation v2](./docs/technical-foundation-v2.md) Appendix A (001–017).

**Sprint 0 gate (M-DB):**

```bash
supabase db reset   # applies migrations + seed.sql
```

Seed includes: platform settings, Makerere University pilot, semester, tiers, 2 restaurants, 3 meal plans, payout rates.

Auth users (admin, test students) are created in Sprint 1.

## CI

GitHub Actions (`.github/workflows/ci.yml`):

1. Format, lint, typecheck, build
2. Supabase migration smoke (`supabase db reset`)

## Pre-commit

Husky + lint-staged runs Prettier and ESLint on staged files.

## Documentation

- [Technical Foundation v2](./docs/technical-foundation-v2.md)
- [MVP Implementation Roadmap](./docs/MVP Implementation Roadmap.md)
- [Design System](./docs/design-system.md)
- [Business Rules](./docs/business-rules.md)

## Sprint 0 scope

This foundation includes monorepo tooling, Next.js scaffold, shared packages, full database schema, env validation, and CI. **No business logic or UI pages** — those begin in Sprint 1.
