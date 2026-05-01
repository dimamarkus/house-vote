export const extensionMessageTypes = {
  authStatus: 'HOUSE_VOTE_AUTH_STATUS',
  healthCheck: 'HOUSE_VOTE_EXTENSION_HEALTH_CHECK',
} as const;

export type ExtensionMessageType = (typeof extensionMessageTypes)[keyof typeof extensionMessageTypes];

export interface ExtensionMessage {
  type: ExtensionMessageType;
}

export interface ExtensionAuthStatus {
  isConfigured: boolean;
  isSignedIn: boolean;
  userId: string | null;
  emailAddress: string | null;
  token: string | null;
  appUrl: string | null;
  signInUrl: string | null;
  error: string | null;
}
