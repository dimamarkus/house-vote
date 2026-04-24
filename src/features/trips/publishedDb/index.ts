import { addFeedback, setCommentHidden } from './comments';
import { addOwnerGuest, claimGuestSession, removeGuest } from './guests';
import { submitGuestListingUrl, updateGuestListingDetails } from './listings';
import {
  getOwnerTripShareSummary,
  getPublishedTripByToken,
  publish,
  rotateToken,
  unpublish,
  updateSettings,
} from './share';
import { castVote } from './votes';

/**
 * Single namespace that the rest of the app imports as
 * `publishedTrips.*`. The methods are assembled from the domain
 * files in this folder so each call site gets the same public API
 * it had pre-split.
 */
export const publishedTrips = {
  getPublishedTripByToken,
  getOwnerTripShareSummary,
  publish,
  unpublish,
  updateSettings,
  rotateToken,
  addOwnerGuest,
  removeGuest,
  claimGuestSession,
  castVote,
  addFeedback,
  setCommentHidden,
  updateGuestListingDetails,
  submitGuestListingUrl,
};

export type {
  DbClient,
  OwnerTripCommentRecord,
  OwnerTripShareListingRecord,
  PublishedTripCommentRecord,
  PublishedTripGuestRecord,
  PublishedTripListingRecord,
  PublishedTripShareRecord,
} from './types';
