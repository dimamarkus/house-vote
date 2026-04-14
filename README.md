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

## Published voting (public share link)

Trip owners can expose a **public voting page** that does not require sign-in. Anyone with the link can pick a guest name, cast **one vote per guest** (they can change which listing they vote for), and optionally suggest a new listing URL when the owner allows it.

- **URL:** `/share/<token>` where `<token>` is a UUID stored on `TripShare`. The route is treated as public in `src/proxy.ts` (no Clerk gate on `/share/*`). The page header card shows trip location, dates, and a guest-list count pill that opens the current roster with each guest's latest vote preview.
- **Owner controls (trip dashboard sidebar):**
  - **Voting** — publish/unpublish, open or close voting, rotate link (invalidates old URLs), copy link and open in a new tab, toggle whether guests may submit listing URLs.
  - **Guests** — trip team (owner + collaborators), add or remove guest names for the public list, invite collaborators by email, and see voting participation when available. Guests can also add their own name on the public page if it is missing (subject to unique name per trip).
- **Guest identity on the device:** `localStorage` key `housevote_published_guest_<tripId>` holds `{ guestId, guestDisplayName }` (see `src/features/trips/constants/publishedGuestSession.ts`). Clearing storage or using another browser starts a fresh session.
- **Product vs. dashboard likes:** Signed-in collaborators still use **likes** on the main trip dashboard. **Published votes** are separate rows (`TripVote`) and power the public page tallies and owner-side guest status.
- **Listing statuses on the public board:** Listings that move out of the active/potential state still stay visible on the public board with a status badge, but they cannot receive new votes. The "Current winner" badge always moves to the highest-voted active listing.

For behavior, data rules, and edge cases in plain language, see [instructions/meta/housevote-overview.md](instructions/meta/housevote-overview.md) (section *Published trip voting*).

## Standalone Notes

This app is being extracted from the `turbodima` monorepo into an app-owned standalone repo.

That means this repo now owns:

- its own package name: `house-vote`
- its own TypeScript, ESLint, and PostCSS config
- its own Prisma generation workflow
- its own app-local replacements for monorepo core helpers
