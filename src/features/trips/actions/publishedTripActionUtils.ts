import type { TripShareSettings, TripShareState } from '../types';

/**
 * Every share-page write touches the same three cache keys: the owner
 * dashboard, and — when there's a publish token — the public share page and
 * its guest-onboarding subroute. Callers that don't have a token yet (e.g.
 * "add owner guest" before the trip is published) pass `undefined` and only
 * the dashboard path is returned.
 *
 * Returned as a plain array (rather than calling `revalidatePath` directly)
 * so it composes with the `revalidate` contract of `createServerAction`,
 * which calls `revalidatePath` on each entry itself.
 */
export function publishedTripRevalidationPaths(tripId: string, token?: string): string[] {
  const paths = [`/trips/${tripId}`];

  if (token) {
    paths.push(`/share/${token}`);
    paths.push(`/share/${token}/join`);
  }

  return paths;
}

/**
 * Project a raw TripShare db row onto the `TripShareState` action response
 * shape. Reused by every owner action that mutates the share row (publish,
 * unpublish, update settings, rotate token) so the client always gets the
 * same fields back.
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
