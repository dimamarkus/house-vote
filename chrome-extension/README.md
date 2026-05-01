# House Vote Chrome Extension

## Local Development

Set the extension sync host in `.env.local`:

```bash
HOUSE_VOTE_EXTENSION_SYNC_HOST=http://localhost:3000
```

The extension also uses the app's existing `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
When testing against production, both values must point at the production Clerk/app pair:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
HOUSE_VOTE_EXTENSION_SYNC_HOST=https://your-production-domain.com
```

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

## Clerk Session Sync

Before Clerk session sync can work in the browser, the Chrome extension origin must be added to Clerk's `allowed_origins`.

For local development, that origin is based on the loaded extension id:

```text
chrome-extension://<extension-id>
```

Use a stable extension id before relying on this for repeated testing. Production should use the Chrome Web Store extension id.

Patch the Clerk instance with the loaded extension origin:

```bash
curl -X PATCH https://api.clerk.com/v1/instance \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"allowed_origins": ["chrome-extension://YOUR_EXTENSION_ID"]}'
```

Use the secret key from the same Clerk instance as the extension publishable key. For example, a `pk_live_...` extension build needs the matching production `sk_live_...` key for this patch command.
