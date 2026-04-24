import { auth } from '@clerk/nextjs/server';

/**
 * Thrown by `requireUserId` when no Clerk session is present on the server.
 *
 * Kept as a named error class (instead of a bare `Error`) so the server-action
 * wrapper can distinguish "user is not signed in" from domain errors and emit
 * the correct `UNAUTHENTICATED` code + message in its response.
 */
export class UnauthenticatedError extends Error {
  public readonly name = 'UnauthenticatedError';

  constructor(message = 'You must be signed in to perform this action.') {
    super(message);
  }
}

/**
 * Resolve the currently-authenticated Clerk user id on the server, or throw
 * an `UnauthenticatedError`.
 *
 * Designed to be called from inside a server action wrapped with
 * `createServerAction`, which catches `UnauthenticatedError` and converts it
 * into a standard `UNAUTHENTICATED` error response. Callers that need custom
 * behavior (e.g. redirect) can catch it directly.
 */
export async function requireUserId(message?: string): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new UnauthenticatedError(message);
  }

  return userId;
}
