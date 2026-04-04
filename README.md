# House Vote

A collaborative trip-planning app for comparing, discussing, and voting on rental listings.

## Scripts

- install: `pnpm install`
- dev: `pnpm dev`
- build: `pnpm build`
- vercel build: `pnpm vercel-build`
- start: `pnpm start`
- lint: `pnpm lint`
- types: `pnpm check-types`
- prisma generate: `pnpm db:generate`
- prisma migrate deploy: `pnpm db:migrate:deploy`
- prisma push: `pnpm db:push`
- prisma status: `pnpm db:status`
- prisma studio: `pnpm db:studio`

## Runtime

- Node: `24.x`
- Package manager: `pnpm@10.33.0`

## First-Time Setup

1. Copy `env.example` to `.env.local`.
2. Install dependencies with `pnpm install`.
3. Generate the Prisma client with `pnpm db:generate`.
4. Ensure your Postgres database is reachable via `DATABASE_URL`.
5. Apply schema changes with `pnpm db:push` or your preferred Prisma migration workflow.
6. Start the app with `pnpm dev`.

## Env

Copy `env.example` to `.env.local`.

### Database

Required:

- `DATABASE_URL`

Optional but recommended for production migrations:

- `DIRECT_DATABASE_URL`

The app uses Prisma with a Postgres datasource. Without a valid `DATABASE_URL`, Prisma generation and runtime DB access will fail.
If your host gives you a pooled runtime URL and a separate direct connection URL, keep `DATABASE_URL` for runtime and use `DIRECT_DATABASE_URL` for migrations.

### Clerk

Required:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Clerk stays enabled in this standalone app, so authenticated flows and protected routes depend on those env values.

## Deploy Notes

Use a custom Vercel build command so production deploys apply pending Prisma migrations before the app build.

- `pnpm build` runs `prisma generate` automatically via `prebuild`
- `pnpm check-types` runs `prisma generate` automatically via `precheck-types`
- Node is pinned via `package.json` engines and `.nvmrc`
- pnpm is pinned via `packageManager`
- `pnpm vercel-build` runs `prisma migrate deploy` only for production deploys, then runs the normal app build

### Vercel Setup

Set the project build command to:

`pnpm vercel-build`

For Vercel or any other fresh CI environment, make sure these env vars exist at build/runtime:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL` (recommended when migrations should use a direct DB connection)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

If a fresh deploy fails with Prisma types missing, that means the build did not run through the package scripts. The intended Vercel entrypoint is `pnpm vercel-build`, not `next build` directly.

## Generated Code

This repo uses Prisma's standard `@prisma/client` generation flow.

- regenerate with `pnpm db:generate` after Prisma schema changes

## Standalone Notes

This app is being extracted from the `turbodima` monorepo into an app-owned standalone repo.

That means this repo now owns:

- its own package name: `house-vote`
- its own TypeScript, ESLint, and PostCSS config
- its own Prisma generation workflow
- its own app-local replacements for monorepo core helpers
