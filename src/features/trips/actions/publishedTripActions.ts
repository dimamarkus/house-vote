'use server';

import { ListingCommentKind } from 'db';
import { createServerAction } from '@/core/server-actions';
import type { BasicApiResponse } from '@/core/types';
import { getListingFeedbackConfig } from '../constants/listing-feedback';
import { publishedTrips } from '../publishedDb';
import type { TripShareState } from '../types';
import {
  addCommentSchema,
  castVoteSchema,
  guestNameSchema,
  moderateCommentSchema,
  publishedGuestSessionSchema,
  removeGuestSchema,
  submitListingSchema,
  tripIdSchema,
  updateListingDetailsSchema,
  updatePublishedTripSettingsSchema,
} from './publishedTripSchemas';
import {
  publishedTripRevalidationPaths,
  toTripShareState,
} from './publishedTripActionUtils';

type PublishedGuestSession = {
  tripId: string;
  guestId: string;
  guestDisplayName: string;
};

type PublishedVoteResult = {
  tripId: string;
  guestId: string;
  listingId: string | null;
};

type PublishedListingResult = {
  tripId: string;
  listingId: string;
};

type PublishedCommentResult = {
  tripId: string;
  guestId: string;
  listingId: string;
  commentId: string;
};

type PublishedCommentModerationResult = {
  tripId: string;
  commentId: string;
  hidden: boolean;
};

export async function publishTripShare(input: { tripId: string }): Promise<BasicApiResponse<TripShareState>> {
  return createServerAction({
    input,
    schema: tripIdSchema,
    requireAuth: true,
    errorPrefix: 'Failed to publish trip voting:',
    validationErrorMessage: 'Invalid publish request.',
    handler: async ({ input: { tripId }, userId }) => {
      const share = await publishedTrips.publish(tripId, userId);
      return {
        data: toTripShareState(tripId, share),
        revalidate: publishedTripRevalidationPaths(tripId, share.token),
      };
    },
  });
}

export async function unpublishTripShare(input: { tripId: string }): Promise<BasicApiResponse<TripShareState>> {
  return createServerAction({
    input,
    schema: tripIdSchema,
    requireAuth: true,
    errorPrefix: 'Failed to unpublish trip voting:',
    validationErrorMessage: 'Invalid publish request.',
    handler: async ({ input: { tripId }, userId }) => {
      const share = await publishedTrips.unpublish(tripId, userId);
      return {
        data: toTripShareState(tripId, share),
        revalidate: publishedTripRevalidationPaths(tripId, share.token),
      };
    },
  });
}

export async function updateTripShareSettings(
  input: {
    tripId: string;
    votingOpen?: boolean;
    commentsOpen?: boolean;
    allowGuestSuggestions?: boolean;
  },
): Promise<BasicApiResponse<TripShareState>> {
  return createServerAction({
    input,
    schema: updatePublishedTripSettingsSchema,
    requireAuth: true,
    errorPrefix: 'Failed to update published trip settings:',
    validationErrorMessage: 'Invalid settings update request.',
    handler: async ({ input: { tripId, votingOpen, commentsOpen, allowGuestSuggestions }, userId }) => {
      const share = await publishedTrips.updateSettings(tripId, userId, {
        votingOpen,
        commentsOpen,
        allowGuestSuggestions,
      });
      return {
        data: toTripShareState(tripId, share),
        revalidate: publishedTripRevalidationPaths(tripId, share.token),
      };
    },
  });
}

export async function rotateTripShareToken(input: { tripId: string }): Promise<BasicApiResponse<TripShareState>> {
  return createServerAction({
    input,
    schema: tripIdSchema,
    requireAuth: true,
    errorPrefix: 'Failed to rotate published trip link:',
    validationErrorMessage: 'Invalid rotation request.',
    handler: async ({ input: { tripId }, userId }) => {
      const share = await publishedTrips.rotateToken(tripId, userId);
      return {
        data: toTripShareState(tripId, share),
        revalidate: publishedTripRevalidationPaths(tripId, share.token),
      };
    },
  });
}

export async function addPublishedTripGuest(input: {
  tripId: string;
  displayName: string;
}): Promise<BasicApiResponse<{ guestId: string; guestDisplayName: string }>> {
  return createServerAction({
    input,
    schema: guestNameSchema,
    requireAuth: true,
    errorPrefix: 'Failed to add guest:',
    validationErrorMessage: 'Invalid guest request.',
    handler: async ({ input: { tripId, displayName }, userId }) => {
      const guest = await publishedTrips.addOwnerGuest(tripId, userId, displayName);
      return {
        data: {
          guestId: guest.id,
          guestDisplayName: guest.guestDisplayName,
        },
        revalidate: publishedTripRevalidationPaths(tripId),
      };
    },
  });
}

export async function removePublishedTripGuest(input: {
  tripId: string;
  guestId: string;
}): Promise<BasicApiResponse<{ guestId: string }>> {
  return createServerAction({
    input,
    schema: removeGuestSchema,
    requireAuth: true,
    errorPrefix: 'Failed to remove guest:',
    validationErrorMessage: 'Invalid guest removal request.',
    handler: async ({ input: { tripId, guestId }, userId }) => {
      await publishedTrips.removeGuest(tripId, userId, guestId);
      return {
        data: { guestId },
        revalidate: publishedTripRevalidationPaths(tripId),
      };
    },
  });
}

export async function claimPublishedTripGuest(
  input: {
    token: string;
    guestId: string;
  },
): Promise<BasicApiResponse<PublishedGuestSession>> {
  return createServerAction({
    input,
    schema: publishedGuestSessionSchema,
    requireAuth: false,
    errorPrefix: 'Failed to claim guest session:',
    validationErrorMessage: 'Invalid guest session request.',
    handler: async ({ input: { token, guestId } }) => {
      const result = await publishedTrips.claimGuestSession(token, guestId);
      return {
        data: {
          tripId: result.share.tripId,
          guestId: result.guest.id,
          guestDisplayName: result.guest.guestDisplayName,
        },
        revalidate: publishedTripRevalidationPaths(result.share.tripId, result.share.token),
      };
    },
  });
}

export async function castPublishedTripVote(
  input: {
    token: string;
    guestId: string;
    listingId: string;
  },
): Promise<BasicApiResponse<PublishedVoteResult>> {
  return createServerAction({
    input,
    schema: castVoteSchema,
    requireAuth: false,
    errorPrefix: 'Failed to cast vote:',
    validationErrorMessage: 'Invalid vote request.',
    handler: async ({ input: { token, guestId, listingId } }) => {
      const vote = await publishedTrips.castVote(token, guestId, listingId);
      return {
        data: {
          tripId: vote.tripId,
          guestId: vote.guestId,
          listingId: vote.listingId,
        },
        revalidate: publishedTripRevalidationPaths(vote.tripId, token),
      };
    },
  });
}

export async function updatePublishedTripListingDetails(
  input: {
    token: string;
    guestId: string;
    listingId: string;
    price?: number | null;
    bedroomCount?: number | null;
    bedCount?: number | null;
    bathroomCount?: number | null;
    notes?: string | null;
  },
): Promise<BasicApiResponse<PublishedListingResult>> {
  return createServerAction({
    input,
    schema: updateListingDetailsSchema,
    requireAuth: false,
    errorPrefix: 'Failed to update listing:',
    validationErrorMessage: 'Invalid listing update request.',
    handler: async ({ input: { token, guestId, listingId, price, bedroomCount, bedCount, bathroomCount, notes } }) => {
      const listing = await publishedTrips.updateGuestListingDetails(token, guestId, listingId, {
        price,
        bedroomCount,
        bedCount,
        bathroomCount,
        notes,
      });
      return {
        data: {
          tripId: listing.tripId,
          listingId: listing.id,
        },
        revalidate: publishedTripRevalidationPaths(listing.tripId, token),
      };
    },
  });
}

export async function submitPublishedTripListing(
  input: {
    token: string;
    guestId: string;
    url: string;
  },
): Promise<BasicApiResponse<PublishedListingResult>> {
  return createServerAction({
    input,
    schema: submitListingSchema,
    requireAuth: false,
    errorPrefix: 'Failed to submit guest listing:',
    validationErrorMessage: 'Invalid listing submission request.',
    handler: async ({ input: { token, guestId, url } }) => {
      const listing = await publishedTrips.submitGuestListingUrl(token, guestId, url);
      return {
        data: {
          tripId: listing.tripId,
          listingId: listing.id,
        },
        revalidate: publishedTripRevalidationPaths(listing.tripId, token),
      };
    },
  });
}

export async function addPublishedTripListingFeedback(
  input: {
    token: string;
    guestId: string;
    listingId: string;
    kind: ListingCommentKind;
    body: string;
  },
): Promise<BasicApiResponse<PublishedCommentResult>> {
  return createServerAction({
    input,
    schema: addCommentSchema,
    requireAuth: false,
    validationErrorMessage: 'Invalid comment request.',
    errorPrefix: (parsed) => `Failed to add ${getListingFeedbackConfig(parsed.kind).singularLabel.toLowerCase()}:`,
    handler: async ({ input: { token, guestId, listingId, kind, body } }) => {
      const comment = await publishedTrips.addFeedback(token, guestId, listingId, kind, body);
      return {
        data: {
          tripId: comment.tripId,
          guestId: comment.guestId,
          listingId: comment.listingId,
          commentId: comment.id,
        },
        revalidate: publishedTripRevalidationPaths(comment.tripId, token),
      };
    },
  });
}

export async function setPublishedTripCommentHidden(
  input: {
    tripId: string;
    commentId: string;
    hidden: boolean;
  },
): Promise<BasicApiResponse<PublishedCommentModerationResult>> {
  return createServerAction({
    input,
    schema: moderateCommentSchema,
    requireAuth: true,
    errorPrefix: 'Failed to moderate comment:',
    validationErrorMessage: 'Invalid comment moderation request.',
    handler: async ({ input: { tripId, commentId, hidden }, userId }) => {
      const result = await publishedTrips.setCommentHidden(tripId, userId, commentId, hidden);
      return {
        data: {
          tripId,
          commentId: result.comment.id,
          hidden: result.comment.hiddenAt !== null,
        },
        revalidate: publishedTripRevalidationPaths(tripId, result.shareToken ?? undefined),
      };
    },
  });
}
