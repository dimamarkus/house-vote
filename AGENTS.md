# House Vote

Collaborative trip-planning app for comparing, discussing, and voting on rental listings. Single Next.js application (not a monorepo) with Prisma ORM and Clerk authentication.

## Cursor Cloud specific instructions

### Required services

| Service | How to start | Notes |
|---|---|---|
| PostgreSQL | `sudo pg_ctlcluster 16 main start` | Must be running before the app. DB user `housevote` / db `housevote` on localhost:5432 |
| Next.js dev server | `pnpm dev` | Runs on port 3000 |

### Environment variables

The app reads from `.env.local` (Next.js) and `.env` (Prisma via `dotenv/config` in `prisma.config.ts`). A symlink `.env -> .env.local` keeps both in sync. Required secrets:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (injected as env secret)
- `CLERK_SECRET_KEY` — Clerk secret key (injected as env secret)

### Key commands

See `README.md` for the full list. Quick reference:

- **Dev server:** `pnpm dev`
- **Lint:** `pnpm lint` (3 pre-existing `react-hooks/set-state-in-effect` errors as of initial setup)
- **Type check:** `pnpm check-types` (runs `prisma generate` automatically via `precheck-types`)
- **Tests:** `pnpm test` (Vitest)
- **Prisma generate:** `pnpm db:generate`
- **Prisma push schema:** `pnpm db:push`
- **Prisma studio:** `pnpm db:studio`

### Gotchas

- **Prisma needs `.env`:** `prisma.config.ts` imports `dotenv/config`, which reads `.env` (not `.env.local`). The symlink `.env -> .env.local` handles this. If you recreate `.env.local`, also recreate the symlink: `ln -sf .env.local .env`.
- **Node 24 required:** The project pins Node `>=24.0.0 <25` in `package.json` engines and `24.14.1` in `.nvmrc`. Use `nvm use` or ensure Node 24 is active.
- **pnpm only:** The project uses `pnpm@10.33.0` (declared via `packageManager`). Do not use npm or yarn.
- **`pnpm.onlyBuiltDependencies`** is configured in `package.json` — no interactive `pnpm approve-builds` is needed.
- **Lint has pre-existing errors:** `pnpm lint` currently fails with 3 `react-hooks/set-state-in-effect` errors in `VotingAccessCard.tsx`, `PhotoCarousel.tsx`, and `PhotoLightbox.tsx`. These are not caused by agent changes.
