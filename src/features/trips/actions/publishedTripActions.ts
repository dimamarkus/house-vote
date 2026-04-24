'use server';

import { ListingCommentKind } from 'db';
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
  requireOwnerUserId,
  runPublishedAction,
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
  return runPublishedAction({
    input,
    schema: tripIdSchema,
    errorPrefix: 'Failed to publish trip voting:',
    validationErrorMessage: 'Invalid publish request.',
    handler: async ({ tripId }) => {
      const ownerId = await requireOwnerUserId();
      const share = await publishedTrips.publish(tripId, ownerId);

      return {
        tripId,
        token: share.token,
        data: toTripShareState(tripId, share),
      };
    },
  });
}

export async function unpublishTripShare(input: { tripId: string }): Promise<BasicApiResponse<TripShareState>> {
  return runPublishedAction({
    input,
    schema: tripIdSchema,
    errorPrefix: 'Failed to unpublish trip voting:',
    validationErrorMessage: 'Invalid publish request.',
    handler: async ({ tripId }) => {
      const ownerId = await requireOwnerUserId();
      const share = await publishedTrips.unpublish(tripId, ownerId);

      return {
        tripId,
        token: share.token,
        data: toTripShareState(tripId, share),
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
  return runPublishedAction({
    input,
    schema: updatePublishedTripSettingsSchema,
    errorPrefix: 'Failed to update published trip settings:',
    validationErrorMessage: 'Invalid settings update request.',
    handler: async ({ tripId, votingOpen, commentsOpen, allowGuestSuggestions }) => {
      const ownerId = await requireOwnerUserId();
      const share = await publishedTrips.updateSettings(tripId, ownerId, {
        votingOpen,
        commentsOpen,
        allowGuestSuggestions,
      });

      return {
        tripId,
        token: share.token,
        data: toTripShareState(tripId, share),
      };
    },
  });
}

export async function rotateTripShareToken(input: { tripId: string }): Promise<BasicApiResponse<TripShareState>> {
  return runPublishedAction({
    input,
    schema: tripIdSchema,
    errorPrefix: 'Failed to rotate published trip link:',
    validationErrorMessage: 'Invalid rotation request.',
    handler: async ({ tripId }) => {
      const ownerId = await requireOwnerUserId();
      const share = await publishedTrips.rotateToken(tripId, ownerId);

      return {
        tripId,
        token: share.token,
        data: toTripShareState(tripId, share),
      };
    },
  });
}

export async function addPublishedTripGuest(input: {
  tripId: string;
  displayName: string;
}): Promise<BasicApiResponse<{ guestId: string; guestDisplayName: string }>> {
  return runPublishedAction({
    input,
    schema: guestNameSchema,
    errorPrefix: 'Failed to add guest:',
    validationErrorMessage: 'Invalid guest request.',
    handler: async ({ tripId, displayName }) => {
      const ownerId = await requireOwnerUserId();
      const guest = await publishedTrips.addOwnerGuest(tripId, ownerId, displayName);

      return {
        tripId,
        data: {
          guestId: guest.id,
          guestDisplayName: guest.guestDisplayName,
        },
      };
    },
  });
}

export async function removePublishedTripGuest(input: {
  tripId: string;
  guestId: string;
}): Promise<BasicApiResponse<{ guestId: string }>> {
  return runPublishedAction({
    input,
    schema: removeGuestSchema,
    errorPrefix: 'Failed to remove guest:',
    validationErrorMessage: 'Invalid guest removal request.',
    handler: async ({ tripId, guestId }) => {
      const ownerId = await requireOwnerUserId();
      await publishedTrips.removeGuest(tripId, ownerId, guestId);

      return {
        tripId,
        data: { guestId },
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
  return runPublishedAction({
    input,
    schema: publishedGuestSessionSchema,
    errorPrefix: 'Failed to claim guest session:',
    validationErrorMessage: 'Invalid guest session request.',
    handler: async ({ token, guestId }) => {
      const result = await publishedTrips.claimGuestSession(token, guestId);

      return {
        tripId: result.share.tripId,
        token: result.share.token,
        data: {
          tripId: result.share.tripId,
          guestId: result.guest.id,
          guestDisplayName: result.guest.guestDisplayName,
        },
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
  return runPublishedAction({
    input,
    schema: castVoteSchema,
    errorPrefix: 'Failed to cast vote:',
    validationErrorMessage: 'Invalid vote request.',
    handler: async ({ token, guestId, listingId }) => {
      const vote = await publishedTrips.castVote(token, guestId, listingId);

      return {
        tripId: vote.tripId,
        token,
        data: {
          tripId: vote.tripId,
          guestId: vote.guestId,
          listingId: vote.listingId,
        },
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
  return runPublishedAction({
    input,
    schema: updateListingDetailsSchema,
    errorPrefix: 'Failed to update listing:',
    validationErrorMessage: 'Invalid listing update request.',
    handler: async ({ token, guestId, listingId, price, bedroomCount, bedCount, bathroomCount, notes }) => {
      const listing = await publishedTrips.updateGuestListingDetails(token, guestId, listingId, {
        price,
        bedroomCount,
        bedCount,
        bathroomCount,
        notes,
      });

      return {
        tripId: listing.tripId,
        token,
        data: {
          tripId: listing.tripId,
          listingId: listing.id,
        },
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
  return runPublishedAction({
    input,
    schema: submitListingSchema,
    errorPrefix: 'Failed to submit guest listing:',
    validationErrorMessage: 'Invalid listing submission request.',
    handler: async ({ token, guestId, url }) => {
      const listing = await publishedTrips.submitGuestListingUrl(token, guestId, url);

      return {
        tripId: listing.tripId,
        token,
        data: {
          tripId: listing.tripId,
          listingId: listing.id,
        },
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
  return runPublishedAction({
    input,
    schema: addCommentSchema,
    validationErrorMessage: 'Invalid comment request.',
    errorPrefix: (parsed) => `Failed to add ${getListingFeedbackConfig(parsed.kind).singularLabel.toLowerCase()}:`,
    handler: async ({ token, guestId, listingId, kind, body }) => {
      const comment = await publishedTrips.addFeedback(token, guestId, listingId, kind, body);

      return {
        tripId: comment.tripId,
        token,
        data: {
          tripId: comment.tripId,
          guestId: comment.guestId,
          listingId: comment.listingId,
          commentId: comment.id,
        },
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
  return runPublishedAction({
    input,
    schema: moderateCommentSchema,
    errorPrefix: 'Failed to moderate comment:',
    validationErrorMessage: 'Invalid comment moderation request.',
    handler: async ({ tripId, commentId, hidden }) => {
      const ownerId = await requireOwnerUserId();
      const result = await publishedTrips.setCommentHidden(tripId, ownerId, commentId, hidden);

      return {
        tripId,
        token: result.shareToken ?? undefined,
        data: {
          tripId,
          commentId: result.comment.id,
          hidden: result.comment.hiddenAt !== null,
        },
      };
    },
  });
}
