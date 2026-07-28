# House Vote Chrome Extension

## Configuration

The extension talks directly to Clerk, so its build config must point at the
**same Clerk instance the user actually signs into**. It reads three dedicated
env vars at build time (from `.env.local`):

- `HOUSE_VOTE_EXTENSION_SYNC_HOST` — where Clerk syncs the browser session from.
  **This is not the app domain in production.** For a production instance it is
  the **Clerk Frontend API domain** (e.g. `https://clerk.your-domain.com`); in
  dev it is `http://localhost`. This is where Clerk's long-lived `__client`
  cookie lives, and it's what `createClerkClient({ syncHost })` reads.
- `HOUSE_VOTE_EXTENSION_APP_URL` — the House Vote web app origin. Used for the
  `/api/extension/*` calls and sign-in / open-trip links.
- `HOUSE_VOTE_EXTENSION_CLERK_PUBLISHABLE_KEY` — the Clerk publishable key for
  that same instance.

The publishable key is intentionally separate from the app's
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` because local web dev (`pnpm dev`) usually
needs a `pk_test_...` key while an extension that syncs with production needs the
deployed site's `pk_live_...` key.

> **Why two domains?** For a production Clerk instance the session cookie lives
> on the Frontend API domain (`clerk.your-domain.com`), while the app and its
> extension API routes are served from the primary domain. Collapsing them into
> one value breaks either session sync or the `/api/extension/*` calls. You can
> decode the FAPI domain from your publishable key: strip the `pk_live_` prefix
> and base64-decode the rest.

Local web dev:

```bash
HOUSE_VOTE_EXTENSION_SYNC_HOST=http://localhost
HOUSE_VOTE_EXTENSION_APP_URL=http://localhost:3000
HOUSE_VOTE_EXTENSION_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Sync with production (note: **https**, not http — Clerk's session cookie is
`Secure` and is invisible to the extension over http):

```bash
HOUSE_VOTE_EXTENSION_SYNC_HOST=https://clerk.your-production-domain.com
HOUSE_VOTE_EXTENSION_APP_URL=https://your-production-domain.com
HOUSE_VOTE_EXTENSION_CLERK_PUBLISHABLE_KEY=pk_live_...
```

The build fails loudly if any value is missing.

## Local Development

Build the extension from the repo root:

```bash
pnpm extension:build
```

For iterative work:

```bash
pnpm extension:watch
```

Load the built extension in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select `chrome-extension/dist`.

The source files live in `chrome-extension/src`. The generated `chrome-extension/dist` folder is ignored by git.

## Import Flow

The extension uses the signed-in House Vote web session through Clerk session sync. It loads the user's accessible trips from `GET /api/extension/trips` and saves listings through `POST /api/extension/import-listing`.

The old manual trip id/import token flow has been removed. If imports fail, verify Clerk session sync and the extension origin setup below rather than looking for an import token.

## Clerk Session Sync

For the extension to detect a signed-in web session, the Clerk instance it
targets must be configured for extension use. On the **same Clerk instance** as
the publishable key you built with:

1. **Enable Native API** (Clerk Dashboard → Native applications). Required for
   any extension integration.
2. **Disable bot protection** for the instance. Cloudflare bot detection is not
   supported in extension environments and makes session sync fail.
3. **Add the extension origin to `allowed_origins`.** Get the id from
   `chrome://extensions` (for an unpacked build it stays stable as long as the
   `chrome-extension/dist` path does not move):

```bash
curl -X PATCH https://api.clerk.com/v1/instance \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"allowed_origins": ["chrome-extension://YOUR_EXTENSION_ID"]}'
```

Use the secret key from the **same** Clerk instance as the extension publishable
key. A `pk_live_...` extension build needs the matching production `sk_live_...`
key for this patch command.

## Troubleshooting

- **Popup says "Not signed in" while you are signed in on the web app.** Almost
  always a mismatch between the extension build and the instance you signed into.
  Check, in order:
  1. `HOUSE_VOTE_EXTENSION_CLERK_PUBLISHABLE_KEY` matches the deployed site's key
     (`pk_live_...` for production, not `pk_test_...`).
  2. `HOUSE_VOTE_EXTENSION_SYNC_HOST` is the **Clerk Frontend API domain** for a
     production instance (e.g. `https://clerk.your-domain.com`), not the app
     domain — using the app domain here is the most common cause of a stuck
     "Not signed in".
  3. `HOUSE_VOTE_EXTENSION_APP_URL` is the app origin (`https://your-domain.com`).
  4. The extension origin is in that instance's `allowed_origins`.
  5. Native API is enabled and bot protection is disabled on that instance.
  6. Rebuild (`pnpm extension:build`) and reload the unpacked extension after any
     config change.
- **Signed in, but trips won't load / saving fails.** `HOUSE_VOTE_EXTENSION_APP_URL`
  is wrong — it must be the app origin serving `/api/extension/*`, not the Clerk
  Frontend API domain.
