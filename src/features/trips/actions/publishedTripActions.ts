'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ErrorCode } from '@/core/errors';
import { createErrorResponse, createSuccessResponse } from '@/core/responses';
import type { BasicApiResponse } from '@/core/types';
import { publishedTrips } from '../publishedDb';

const tripIdSchema = z.object({
  tripId: z.string().cuid('A valid trip id is required.'),
});

const updatePublishedTripSettingsSchema = tripIdSchema.extend({
  votingOpen: z.boolean().optional(),
  allowGuestSuggestions: z.boolean().optional(),
});

const guestNameSchema = tripIdSchema.extend({
  displayName: z.string().trim().min(1, 'Guest name is required.').max(50, 'Guest name is too long.'),
});

const removeGuestSchema = tripIdSchema.extend({
  guestId: z.string().cuid('A valid guest id is required.'),
});

const publishedGuestSessionSchema = z.object({
  token: z.string().uuid('A valid published trip link is required.'),
  guestId: z.string().cuid('A valid guest id is required.'),
});

const createPublishedGuestSchema = z.object({
  token: z.string().uuid('A valid published trip link is required.'),
  displayName: z.string().trim().min(1, 'Guest name is required.').max(50, 'Guest name is too long.'),
});

const castVoteSchema = z.object({
  token: z.string().uuid('A valid published trip link is required.'),
  guestId: z.string().cuid('A valid guest id is required.'),
  listingId: z.string().cuid('A valid listing id is required.'),
});

const submitListingSchema = z.object({
  token: z.string().uuid('A valid published trip link is required.'),
  guestId: z.string().cuid('A valid guest id is required.'),
  url: z.string().url('A valid listing URL is required.'),
});

type PublishedTripShareState = {
  tripId: string;
  token: string;
  isPublished: boolean;
  votingOpen: boolean;
  allowGuestSuggestions: boolean;
};

type PublishedGuestSession = {
  tripId: string;
  guestId: string;
  guestDisplayName: string;
};

type PublishedVoteResult = {
  tripId: string;
  guestId: string;
  listingId: string;
};

type PublishedListingResult = {
  tripId: string;
  listingId: string;
};

function revalidatePublishedTripPaths(tripId: string, token?: string) {
  revalidatePath(`/trips/${tripId}`);

  if (token) {
    revalidatePath(`/share/${token}`);
    revalidatePath(`/share/${token}/join`);
  }
}

async function requireOwnerUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('You must be signed in to manage published trip voting.');
  }

  return userId;
}

export async function publishTripShare(input: { tripId: string }): Promise<BasicApiResponse<PublishedTripShareState>> {
  const validation = tripIdSchema.safeParse(input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? 'Invalid publish request.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  try {
    const ownerId = await requireOwnerUserId();
    const share = await publishedTrips.publish(validation.data.tripId, ownerId);

    revalidatePublishedTripPaths(validation.data.tripId, share.token);

    return createSuccessResponse({
      data: {
        tripId: validation.data.tripId,
        token: share.token,
        isPublished: share.isPublished,
        votingOpen: share.votingOpen,
        allowGuestSuggestions: share.allowGuestSuggestions,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to publish trip voting:',
    });
  }
}

export async function unpublishTripShare(input: { tripId: string }): Promise<BasicApiResponse<PublishedTripShareState>> {
  const validation = tripIdSchema.safeParse(input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? 'Invalid publish request.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  try {
    const ownerId = await requireOwnerUserId();
    const share = await publishedTrips.unpublish(validation.data.tripId, ownerId);

    revalidatePublishedTripPaths(validation.data.tripId, share.token);

    return createSuccessResponse({
      data: {
        tripId: validation.data.tripId,
        token: share.token,
        isPublished: share.isPublished,
        votingOpen: share.votingOpen,
        allowGuestSuggestions: share.allowGuestSuggestions,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to unpublish trip voting:',
    });
  }
}

export async function updateTripShareSettings(
  input: {
    tripId: string;
    votingOpen?: boolean;
    allowGuestSuggestions?: boolean;
  },
): Promise<BasicApiResponse<PublishedTripShareState>> {
  const validation = updatePublishedTripSettingsSchema.safeParse(input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? 'Invalid settings update request.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  if (
    typeof validation.data.votingOpen === 'undefined' &&
    typeof validation.data.allowGuestSuggestions === 'undefined'
  ) {
    return createErrorResponse({
      error: 'No published trip settings were provided.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  try {
    const ownerId = await requireOwnerUserId();
    const share = await publishedTrips.updateSettings(validation.data.tripId, ownerId, {
      votingOpen: validation.data.votingOpen,
      allowGuestSuggestions: validation.data.allowGuestSuggestions,
    });

    revalidatePublishedTripPaths(validation.data.tripId, share.token);

    return createSuccessResponse({
      data: {
        tripId: validation.data.tripId,
        token: share.token,
        isPublished: share.isPublished,
        votingOpen: share.votingOpen,
        allowGuestSuggestions: share.allowGuestSuggestions,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to update published trip settings:',
    });
  }
}

export async function rotateTripShareToken(input: { tripId: string }): Promise<BasicApiResponse<PublishedTripShareState>> {
  const validation = tripIdSchema.safeParse(input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? 'Invalid rotation request.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  try {
    const ownerId = await requireOwnerUserId();
    const share = await publishedTrips.rotateToken(validation.data.tripId, ownerId);

    revalidatePublishedTripPaths(validation.data.tripId, share.token);

    return createSuccessResponse({
      data: {
        tripId: validation.data.tripId,
        token: share.token,
        isPublished: share.isPublished,
        votingOpen: share.votingOpen,
        allowGuestSuggestions: share.allowGuestSuggestions,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to rotate published trip link:',
    });
  }
}

export async function addPublishedTripGuest(input: {
  tripId: string;
  displayName: string;
}): Promise<BasicApiResponse<{ guestId: string; guestDisplayName: string }>> {
  const validation = guestNameSchema.safeParse(input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? 'Invalid guest request.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  try {
    const ownerId = await requireOwnerUserId();
    const guest = await publishedTrips.addOwnerGuest(validation.data.tripId, ownerId, validation.data.displayName);

    revalidatePublishedTripPaths(validation.data.tripId);

    return createSuccessResponse({
      data: {
        guestId: guest.id,
        guestDisplayName: guest.guestDisplayName,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to add guest:',
    });
  }
}

export async function removePublishedTripGuest(input: {
  tripId: string;
  guestId: string;
}): Promise<BasicApiResponse<{ guestId: string }>> {
  const validation = removeGuestSchema.safeParse(input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? 'Invalid guest removal request.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  try {
    const ownerId = await requireOwnerUserId();
    await publishedTrips.removeGuest(validation.data.tripId, ownerId, validation.data.guestId);

    revalidatePublishedTripPaths(validation.data.tripId);

    return createSuccessResponse({
      data: {
        guestId: validation.data.guestId,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to remove guest:',
    });
  }
}

export async function claimPublishedTripGuest(
  input: {
    token: string;
    guestId: string;
  },
): Promise<BasicApiResponse<PublishedGuestSession>> {
  const validation = publishedGuestSessionSchema.safeParse(input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? 'Invalid guest session request.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  try {
    const result = await publishedTrips.claimGuestSession(validation.data.token, validation.data.guestId);

    revalidatePublishedTripPaths(result.share.tripId, result.share.token);

    return createSuccessResponse({
      data: {
        tripId: result.share.tripId,
        guestId: result.guest.id,
        guestDisplayName: result.guest.guestDisplayName,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to claim guest session:',
    });
  }
}

export async function createPublishedTripGuest(
  input: {
    token: string;
    displayName: string;
  },
): Promise<BasicApiResponse<PublishedGuestSession>> {
  const validation = createPublishedGuestSchema.safeParse(input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? 'Invalid guest creation request.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  try {
    const result = await publishedTrips.createGuestSession(validation.data.token, validation.data.displayName);

    revalidatePublishedTripPaths(result.share.tripId, result.share.token);

    return createSuccessResponse({
      data: {
        tripId: result.share.tripId,
        guestId: result.guest.id,
        guestDisplayName: result.guest.guestDisplayName,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to create guest session:',
    });
  }
}

export async function castPublishedTripVote(
  input: {
    token: string;
    guestId: string;
    listingId: string;
  },
): Promise<BasicApiResponse<PublishedVoteResult>> {
  const validation = castVoteSchema.safeParse(input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? 'Invalid vote request.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  try {
    const vote = await publishedTrips.castVote(
      validation.data.token,
      validation.data.guestId,
      validation.data.listingId,
    );

    revalidatePublishedTripPaths(vote.tripId, validation.data.token);

    return createSuccessResponse({
      data: {
        tripId: vote.tripId,
        guestId: vote.guestId,
        listingId: vote.listingId,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to cast vote:',
    });
  }
}

export async function submitPublishedTripListing(
  input: {
    token: string;
    guestId: string;
    url: string;
  },
): Promise<BasicApiResponse<PublishedListingResult>> {
  const validation = submitListingSchema.safeParse(input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? 'Invalid listing submission request.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  try {
    const listing = await publishedTrips.submitGuestListingUrl(
      validation.data.token,
      validation.data.guestId,
      validation.data.url,
    );

    revalidatePublishedTripPaths(listing.tripId, validation.data.token);

    return createSuccessResponse({
      data: {
        tripId: listing.tripId,
        listingId: listing.id,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to submit guest listing:',
    });
  }
}
