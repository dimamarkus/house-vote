# House Vote Chrome Extension

## Configuration

The extension talks directly to Clerk, so its build config must point at the
**same Clerk instance and web origin the user actually signs into**. It reads two
dedicated env vars at build time (from `.env.local`):

- `HOUSE_VOTE_EXTENSION_SYNC_HOST` — the web origin to sync the session from.
- `HOUSE_VOTE_EXTENSION_CLERK_PUBLISHABLE_KEY` — the Clerk publishable key for
  that same origin.

These are intentionally separate from the app's `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
because local web dev (`pnpm dev`) usually needs a `pk_test_...` key while an
extension that syncs with production needs the deployed site's `pk_live_...` key.

Local web dev:

```bash
HOUSE_VOTE_EXTENSION_SYNC_HOST=http://localhost:3000
HOUSE_VOTE_EXTENSION_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Sync with production (note: **https**, not http — Clerk's session cookie is
`Secure` and is invisible to the extension over http):

```bash
HOUSE_VOTE_EXTENSION_SYNC_HOST=https://your-production-domain.com
HOUSE_VOTE_EXTENSION_CLERK_PUBLISHABLE_KEY=pk_live_...
```

The build fails loudly if either value is missing.

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
  2. `HOUSE_VOTE_EXTENSION_SYNC_HOST` is the exact origin you sign into, using
     `https` for a deployed site.
  3. The extension origin is in that instance's `allowed_origins`.
  4. Native API is enabled and bot protection is disabled on that instance.
  5. Rebuild (`pnpm extension:build`) and reload the unpacked extension after any
     config change.
