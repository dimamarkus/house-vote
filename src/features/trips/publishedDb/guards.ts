import { randomUUID } from 'node:crypto';
import { db, ListingStatus, TripGuestSource } from 'db';
import { assertTripOwnerId } from '../guards';
import { publishedTripShareSelect } from './prismaFragments';
import type {
  DbClient,
  PublishedTripShareQueryRecord,
  PublishedTripShareRecord,
} from './types';

/**
 * Thin adapter over the shared `assertTripOwnerId` for the published-
 * voting flow. Keeps callers inside `publishedDb/` reading as
 * `assertTripOwner(tripId, userId, db)` — the action verb is bound
 * once, here.
 */
export function assertTripOwner(tripId: string, userId: string, dbClient: DbClient) {
  return assertTripOwnerId(tripId, userId, 'manage published voting', dbClient);
}

/**
 * Flatten the Prisma payload into the public record shape: guests
 * live beside `trip` rather than inside it. Every read helper in
 * this folder funnels through here so the public shape is consistent.
 */
export function mapPublishedTripShareRecord(share: PublishedTripShareQueryRecord): PublishedTripShareRecord {
  const { trip, ...shareFields } = share;
  const { guests, ...tripFields } = trip;

  return {
    ...shareFields,
    trip: tripFields,
    guests,
  };
}

export function normalizeGuestDisplayName(displayName: string) {
  return displayName.trim().replace(/\s+/g, ' ');
}

export async function findGuestByName(tripId: string, displayName: string, dbClient: DbClient) {
  return dbClient.tripGuest.findFirst({
    where: {
      tripId,
      guestDisplayName: {
        equals: displayName,
        mode: 'insensitive',
      },
    },
  });
}

export async function createGuest(
  tripId: string,
  displayName: string,
  source: typeof TripGuestSource[keyof typeof TripGuestSource],
  dbClient: DbClient,
) {
  const normalizedName = normalizeGuestDisplayName(displayName);

  if (!normalizedName) {
    throw new Error('Guest name cannot be empty.');
  }

  const existingGuest = await findGuestByName(tripId, normalizedName, dbClient);

  if (existingGuest) {
    throw new Error(`"${existingGuest.guestDisplayName}" is already on the guest list.`);
  }

  return dbClient.tripGuest.create({
    data: {
      tripId,
      guestDisplayName: normalizedName,
      source,
    },
  });
}

export async function ensureShareRecord(tripId: string, dbClient: DbClient) {
  return dbClient.tripShare.upsert({
    where: {
      tripId,
    },
    update: {},
    create: {
      tripId,
      token: randomUUID(),
    },
  });
}

export async function getShareByToken(token: string) {
  return db.tripShare.findUnique({
    where: { token },
    select: publishedTripShareSelect,
  });
}

export async function getShareByTripId(tripId: string, dbClient: DbClient) {
  return dbClient.tripShare.findUnique({
    where: { tripId },
    select: {
      token: true,
    },
  });
}

export async function assertPublishedShare(token: string) {
  const share = await getShareByToken(token);

  if (!share) {
    throw new Error('This voting link is invalid.');
  }

  if (!share.isPublished) {
    throw new Error('This voting link is not published right now.');
  }

  return mapPublishedTripShareRecord(share);
}

export async function assertGuestInTrip(tripId: string, guestId: string, dbClient: DbClient) {
  const guest = await dbClient.tripGuest.findUnique({
    where: { id: guestId },
  });

  if (!guest || guest.tripId !== tripId) {
    throw new Error('Guest session is no longer valid for this trip.');
  }

  return guest;
}

/**
 * Verify a listing both exists and belongs to the given trip. The
 * optional `requirePotential` flag additionally enforces the
 * `POTENTIAL` status — the only status eligible for voting. One
 * query covers both cases so the happy path stays a single round
 * trip.
 */
export async function assertListingInTrip(
  tripId: string,
  listingId: string,
  dbClient: DbClient,
  options: { requirePotential?: boolean } = {},
) {
  const listing = await dbClient.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      tripId: true,
      status: true,
    },
  });

  if (!listing || listing.tripId !== tripId) {
    throw new Error('Listing not found for this trip.');
  }

  if (options.requirePotential && listing.status !== ListingStatus.POTENTIAL) {
    throw new Error('Only active listings can receive votes.');
  }

  return listing;
}
