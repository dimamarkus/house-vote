interface ExtensionRuntimeConfig {
  clerkPublishableKey: string;
  syncHost: string;
}

declare const __HOUSE_VOTE_EXTENSION_CONFIG__: ExtensionRuntimeConfig;

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function getExtensionConfig(): ExtensionRuntimeConfig {
  const clerkPublishableKey = __HOUSE_VOTE_EXTENSION_CONFIG__.clerkPublishableKey.trim();
  const syncHost = normalizeOrigin(__HOUSE_VOTE_EXTENSION_CONFIG__.syncHost);

  const missingValues = [
    clerkPublishableKey ? null : 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    syncHost ? null : 'HOUSE_VOTE_EXTENSION_SYNC_HOST',
  ].filter(Boolean);

  if (missingValues.length > 0) {
    throw new Error(`Missing extension config: ${missingValues.join(', ')}`);
  }

  return {
    clerkPublishableKey,
    syncHost,
  };
}
