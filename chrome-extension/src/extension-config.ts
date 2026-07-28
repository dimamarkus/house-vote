interface ExtensionRuntimeConfig {
  clerkPublishableKey: string;
  // Where Clerk syncs the browser session from. For a production instance this
  // is the Clerk Frontend API domain (e.g. https://clerk.your-domain.com), NOT
  // the app domain. In dev it is http://localhost.
  syncHost: string;
  // The House Vote web app origin (e.g. https://your-domain.com). Used for API
  // calls and sign-in / open-trip links. This is distinct from `syncHost`
  // because in production Clerk's session cookie lives on the Frontend API
  // domain while the app itself is served from the primary domain.
  appUrl: string;
}

declare const __HOUSE_VOTE_EXTENSION_CONFIG__: ExtensionRuntimeConfig;

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function getExtensionConfig(): ExtensionRuntimeConfig {
  const clerkPublishableKey = __HOUSE_VOTE_EXTENSION_CONFIG__.clerkPublishableKey.trim();
  const syncHost = normalizeOrigin(__HOUSE_VOTE_EXTENSION_CONFIG__.syncHost);
  const appUrl = normalizeOrigin(__HOUSE_VOTE_EXTENSION_CONFIG__.appUrl);

  const missingValues = [
    clerkPublishableKey ? null : 'HOUSE_VOTE_EXTENSION_CLERK_PUBLISHABLE_KEY',
    syncHost ? null : 'HOUSE_VOTE_EXTENSION_SYNC_HOST',
    appUrl ? null : 'HOUSE_VOTE_EXTENSION_APP_URL',
  ].filter(Boolean);

  if (missingValues.length > 0) {
    throw new Error(`Missing extension config: ${missingValues.join(', ')}`);
  }

  return {
    clerkPublishableKey,
    syncHost,
    appUrl,
  };
}
