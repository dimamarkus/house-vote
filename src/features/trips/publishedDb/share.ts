import { randomUUID } from 'node:crypto';
import { db } from 'db';
import { assertTripOwner, ensureShareRecord, getShareByToken, mapPublishedTripShareRecord } from './guards';
import {
  ownerCommentSelect,
  ownerShareListingSelect,
  publishedListingInclude,
  publishedTripShareSelect,
} from './prismaFragments';

/**
 * Public view of a trip's share state for an anonymous voter,
 * reached through the share token. Returns `null` when the token
 * doesn't resolve; callers decide whether that's a 404 or a silent
 * miss.
 */
export async function getPublishedTripByToken(token: string) {
  const share = await getShareByToken(token);

  if (!share) {
    return null;
  }

  const listings = await db.listing.findMany({
    where: {
      tripId: share.tripId,
    },
    include: publishedListingInclude,
    orderBy: [
      {
        createdAt: 'desc',
      },
    ],
  });

  return {
    share: mapPublishedTripShareRecord(share),
    listings,
  };
}

/**
 * Owner-facing flattened view consumed by the dashboard card and
 * sidebar. Three independent reads so the owner sees the latest
 * share state, the full listing roster (not filtered by status),
 * and all comments including hidden ones — moderation lives in the
 * owner UI.
 */
export async function getOwnerTripShareSummary(tripId: string, ownerId: string) {
  await assertTripOwner(tripId, ownerId, db);

  const share = await db.tripShare.findUnique({
    where: {
      tripId,
    },
    select: publishedTripShareSelect,
  });

  const listings = await db.listing.findMany({
    where: {
      tripId,
    },
    select: ownerShareListingSelect,
    orderBy: [
      {
        createdAt: 'desc',
      },
    ],
  });

  const comments = await db.listingComment.findMany({
    where: {
      tripId,
    },
    select: ownerCommentSelect,
    orderBy: [
      {
        createdAt: 'desc',
      },
    ],
  });

  return {
    share: share ? mapPublishedTripShareRecord(share) : null,
    listings,
    comments,
  };
}

export async function publish(tripId: string, ownerId: string) {
  await assertTripOwner(tripId, ownerId, db);

  const existingShare = await ensureShareRecord(tripId, db);

  return db.tripShare.update({
    where: {
      id: existingShare.id,
    },
    data: {
      isPublished: true,
      publishedAt: existingShare.publishedAt ?? new Date(),
    },
  });
}

export async function unpublish(tripId: string, ownerId: string) {
  await assertTripOwner(tripId, ownerId, db);

  const share = await ensureShareRecord(tripId, db);

  return db.tripShare.update({
    where: {
      id: share.id,
    },
    data: {
      isPublished: false,
    },
  });
}

export async function updateSettings(
  tripId: string,
  ownerId: string,
  data: {
    votingOpen?: boolean;
    commentsOpen?: boolean;
    allowGuestSuggestions?: boolean;
  },
) {
  await assertTripOwner(tripId, ownerId, db);

  const share = await ensureShareRecord(tripId, db);

  return db.tripShare.update({
    where: {
      id: share.id,
    },
    data,
  });
}

export async function rotateToken(tripId: string, ownerId: string) {
  await assertTripOwner(tripId, ownerId, db);

  const share = await ensureShareRecord(tripId, db);

  return db.tripShare.update({
    where: {
      id: share.id,
    },
    data: {
      token: randomUUID(),
    },
  });
}
