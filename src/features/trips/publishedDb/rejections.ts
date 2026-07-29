import { db } from 'db';
import { assertGuestInTrip, assertListingInTrip, assertPublishedShare } from './guards';

/**
 * Guest-initiated rejection. Behaves exactly like an owner reject: the listing
 * flips to REJECTED for everyone and its votes are cleared. We snapshot the
 * guest's display name so "who rejected" survives if the guest is later removed.
 * Gated on `votingOpen` since rejecting is part of the decision process.
 */
export async function rejectGuestListing(
  token: string,
  guestId: string,
  listingId: string,
  reason: string,
) {
  const share = await assertPublishedShare(token);

  if (!share.votingOpen) {
    throw new Error('Voting is closed for this trip.');
  }

  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    throw new Error('A reason is required to reject a listing.');
  }

  const guest = await assertGuestInTrip(share.tripId, guestId, db);

  return db.$transaction(async (tx) => {
    await assertListingInTrip(share.tripId, listingId, tx, { requirePotential: true });

    await tx.tripVote.deleteMany({
      where: { listingId },
    });

    return tx.listing.update({
      where: { id: listingId },
      data: {
        status: 'REJECTED',
        rejectionReason: normalizedReason,
        rejectedAt: new Date(),
        rejectedByGuestId: guest.id,
        rejectedById: null,
        rejectedByName: guest.guestDisplayName,
      },
      select: { id: true, tripId: true, status: true },
    });
  });
}

/**
 * Restore a previously rejected listing back to POTENTIAL and clear the
 * rejection metadata. No reason required.
 */
export async function unrejectGuestListing(
  token: string,
  guestId: string,
  listingId: string,
) {
  const share = await assertPublishedShare(token);

  if (!share.votingOpen) {
    throw new Error('Voting is closed for this trip.');
  }

  await assertGuestInTrip(share.tripId, guestId, db);
  await assertListingInTrip(share.tripId, listingId, db);

  return db.listing.update({
    where: { id: listingId },
    data: {
      status: 'POTENTIAL',
      rejectionReason: null,
      rejectedAt: null,
      rejectedByGuestId: null,
      rejectedById: null,
      rejectedByName: null,
    },
    select: { id: true, tripId: true, status: true },
  });
}
