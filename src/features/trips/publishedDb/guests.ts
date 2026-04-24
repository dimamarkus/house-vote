import { db, TripGuestSource } from 'db';
import {
  assertGuestInTrip,
  assertPublishedShare,
  assertTripOwner,
  createGuest,
} from './guards';

export async function addOwnerGuest(tripId: string, ownerId: string, displayName: string) {
  await assertTripOwner(tripId, ownerId, db);

  return createGuest(tripId, displayName, TripGuestSource.OWNER_ADDED, db);
}

export async function removeGuest(tripId: string, ownerId: string, guestId: string) {
  await assertTripOwner(tripId, ownerId, db);

  const guest = await assertGuestInTrip(tripId, guestId, db);

  return db.tripGuest.delete({
    where: {
      id: guest.id,
    },
  });
}

/**
 * Reattach a browser to an existing guest row via the share token.
 * The guest cookie is signed off of this call in the server action,
 * so bad tokens or tampered guest ids fall through to the generic
 * `"This voting link is invalid."` / `"Guest session is no longer
 * valid for this trip."` errors.
 */
export async function claimGuestSession(token: string, guestId: string) {
  const share = await assertPublishedShare(token);
  const guest = await assertGuestInTrip(share.tripId, guestId, db);

  return {
    share,
    guest,
  };
}
