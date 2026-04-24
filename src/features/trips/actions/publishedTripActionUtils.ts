import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ErrorCode } from '@/core/errors';
import { createErrorResponse, createSuccessResponse } from '@/core/responses';
import type { BasicApiResponse } from '@/core/types';
import type { TripShareSettings, TripShareState } from '../types';

/**
 * Every share-page write touches the same three cache keys: the
 * owner dashboard, and — when there's a publish token — the public
 * share page and its guest-onboarding subroute. Callers that don't
 * have a token yet (e.g. "add owner guest" before the trip is
 * published) pass `undefined` and only the dashboard revalidates.
 */
export function revalidatePublishedTripPaths(tripId: string, token?: string) {
  revalidatePath(`/trips/${tripId}`);

  if (token) {
    revalidatePath(`/share/${token}`);
    revalidatePath(`/share/${token}/join`);
  }
}

/**
 * Resolve the currently-authenticated owner id, or throw. Used by
 * owner-scoped actions (publish, moderate, rotate token). Guest
 * actions skip this because their authorization comes from the
 * share token instead.
 */
export async function requireOwnerUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('You must be signed in to manage published trip voting.');
  }

  return userId;
}

/**
 * Project a raw TripShare db row onto the `TripShareState` action
 * response shape. Reused by every owner action that mutates the
 * share row (publish, unpublish, update settings, rotate token) so
 * the client always gets the same fields back.
 */
export function toTripShareState(tripId: string, share: TripShareSettings): TripShareState {
  return {
    tripId,
    token: share.token,
    isPublished: share.isPublished,
    votingOpen: share.votingOpen,
    commentsOpen: share.commentsOpen,
    allowGuestSuggestions: share.allowGuestSuggestions,
  };
}

/**
 * Result the `runPublishedAction` handler must return: the data the
 * caller sees wrapped in `createSuccessResponse`, plus the
 * `tripId` / optional `token` used to revalidate affected paths.
 * Modeling revalidation as a return value (rather than letting each
 * handler call `revalidatePath` itself) means the wrapper can
 * enforce it uniformly and future auditing can happen in one spot.
 */
export interface PublishedActionResult<TData> {
  tripId: string;
  /** Only set when the action mutated a share that already has a publish token. */
  token?: string;
  data: TData;
}

interface RunPublishedActionArgs<TInput, TData> {
  input: unknown;
  schema: z.ZodType<TInput>;
  handler: (input: TInput) => Promise<PublishedActionResult<TData>>;
  /**
   * Error-response prefix when the handler throws. Use a function
   * when the wording depends on the parsed input (e.g. "Failed to
   * add pro:" vs "Failed to add comment:"). Not used for
   * validation failures — those surface the schema's own message.
   */
  errorPrefix: string | ((input: TInput) => string);
  /**
   * Optional fallback for the rare case where `safeParse` fails
   * without emitting an issue message. Defaults to a generic
   * "Invalid request." so callers don't have to supply one.
   */
  validationErrorMessage?: string;
}

/**
 * Shared skeleton for every share-page server action:
 *
 *   1. Parse the input with the supplied schema.
 *   2. Delegate to the handler, which talks to `publishedTrips.*`.
 *   3. Revalidate the affected paths based on the handler's
 *      `{ tripId, token }` return.
 *   4. Wrap the result (or thrown error) in a `BasicApiResponse`.
 *
 * Kept out of any `'use server'` module because this function is
 * itself a wrapper, not a server action. Each action file imports
 * it and calls it from inside an exported server action.
 */
export async function runPublishedAction<TInput, TData>(
  args: RunPublishedActionArgs<TInput, TData>,
): Promise<BasicApiResponse<TData>> {
  const validation = args.schema.safeParse(args.input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? args.validationErrorMessage ?? 'Invalid request.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  try {
    const { tripId, token, data } = await args.handler(validation.data);
    revalidatePublishedTripPaths(tripId, token);
    return createSuccessResponse({ data });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: typeof args.errorPrefix === 'function' ? args.errorPrefix(validation.data) : args.errorPrefix,
    });
  }
}
