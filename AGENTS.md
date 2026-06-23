# AGENTS.md

LunchLink — university meal-plan platform for Uganda. pnpm + Turborepo monorepo
(`apps/web` Next.js 15 app + shared `packages/*`) backed by a local Supabase
stack (Postgres 15, Auth, Storage, Edge Functions). At Sprint 0 it is an
engineering foundation: full DB schema + seed, env validation, CI, and a
Next.js scaffold. There is intentionally **no UI** yet — `http://localhost:3000`
renders a blank page on purpose (see `README.md` "Sprint 0 scope").

Standard commands live in `README.md` and `package.json` (`pnpm dev`,
`pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm format` / `format:check`).
There is no test framework configured.

## Cursor Cloud specific instructions

- **Docker daemon is not managed by systemd.** Start it manually once per VM
  session before using the Supabase stack:
  `sudo dockerd > /tmp/dockerd.log 2>&1 &` (then `docker ps` to confirm). The
  daemon is configured with the `fuse-overlayfs` storage driver and
  `containerd-snapshotter` disabled (`/etc/docker/daemon.json`) — required for
  Docker-in-Docker here; do not change it. If `docker` needs sudo, run
  `sudo chmod 666 /var/run/docker.sock`.
- **Supabase local stack** (Postgres + Auth + API + Studio) is launched with
  `supabase start` from the repo root, then `supabase db reset` applies all
  migrations + `supabase/seed.sql`. First `supabase start` pulls several images
  (slow); it is fast afterwards. Useful endpoints after start: API
  `http://127.0.0.1:54321`, Studio `http://127.0.0.1:54323`, DB on `54322`.
- **Web env file is required and git-ignored.** `apps/web/.env.local` must exist
  for `pnpm dev`/`pnpm build`. For the local stack use:
  `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and the local anon key from
  `supabase status` (`ANON_KEY`). Copying `.env.example` alone uses placeholder
  values that build fine but do not connect to the local DB.
- **RLS is enabled**, so the anon REST role cannot read seeded tables (e.g.
  `GET /rest/v1/restaurants` returns `401 permission denied`) — that is correct
  behavior, not a misconfiguration. Inspect seed data via Studio or
  `docker exec supabase_db_lunch-link psql -U postgres -d postgres`.
- **Health surfaces** (the only working runtime paths in Sprint 0): web
  `GET http://localhost:3000/api/health` → `{"status":"ok",...}`, and the
  Supabase Edge Function `health` (`supabase functions serve`, then invoke
  `health`).
