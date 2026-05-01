/// <reference types="chrome" />

import { createClerkClient } from '@clerk/chrome-extension/client';
import { getExtensionConfig } from './extension-config';
import {
  type ExtensionAuthStatus,
  type ExtensionMessage,
  extensionMessageTypes,
} from './extension-messages';

function isExtensionMessage(request: unknown): request is ExtensionMessage {
  return Boolean(
    request &&
      typeof request === 'object' &&
      'type' in request &&
      Object.values(extensionMessageTypes).includes(request.type as never),
  );
}

function buildSignInUrl(syncHost: string): string {
  return new URL('/sign-in', `${syncHost}/`).toString();
}

async function getAuthStatus(): Promise<ExtensionAuthStatus> {
  try {
    const config = getExtensionConfig();
    const clerk = await createClerkClient({
      publishableKey: config.clerkPublishableKey,
      syncHost: config.syncHost,
      background: true,
    });
    const token = await clerk.session?.getToken();

    return {
      isConfigured: true,
      isSignedIn: Boolean(clerk.user && token),
      userId: clerk.user?.id ?? null,
      emailAddress: clerk.user?.primaryEmailAddress?.emailAddress ?? null,
      token: token ?? null,
      appUrl: config.syncHost,
      signInUrl: buildSignInUrl(config.syncHost),
      error: null,
    };
  } catch (error) {
    return {
      isConfigured: false,
      isSignedIn: false,
      userId: null,
      emailAddress: null,
      token: null,
      appUrl: null,
      signInUrl: null,
      error: error instanceof Error ? error.message : 'Failed to load extension auth.',
    };
  }
}

chrome.runtime.onMessage.addListener((request: unknown, _sender, sendResponse) => {
  if (!isExtensionMessage(request)) {
    return false;
  }

  if (request.type === extensionMessageTypes.healthCheck) {
    sendResponse({ ok: true });
    return true;
  }

  if (request.type === extensionMessageTypes.authStatus) {
    getAuthStatus()
      .then((authStatus) => sendResponse(authStatus))
      .catch((error) => {
        sendResponse({
          isConfigured: false,
          isSignedIn: false,
          userId: null,
          emailAddress: null,
          token: null,
          appUrl: null,
          signInUrl: null,
          error: error instanceof Error ? error.message : 'Failed to load extension auth.',
        } satisfies ExtensionAuthStatus);
      });
    return true;
  }

  return false;
});
