import { db } from 'db';
import { assertGuestInTrip, assertListingInTrip, assertPublishedShare } from './guards';

/**
 * Toggle-style vote scoped to a single listing: casting the same
 * listing again removes that vote, otherwise it adds one. Guests can
 * hold votes on multiple listings at once. Wrapped in a single
 * transaction so the read of the existing vote can't race the write.
 * Returns `listingId: null` when the vote was cleared so the client
 * UI knows to show the un-voted state for that listing.
 */
export async function castVote(token: string, guestId: string, listingId: string) {
  const share = await assertPublishedShare(token);

  if (!share.votingOpen) {
    throw new Error('Voting is closed for this trip.');
  }

  await assertGuestInTrip(share.tripId, guestId, db);

  return db.$transaction(async (tx) => {
    const existingVote = await tx.tripVote.findUnique({
      where: {
        tripId_guestId_listingId: {
          tripId: share.tripId,
          guestId,
          listingId,
        },
      },
    });

    if (existingVote) {
      await tx.tripVote.delete({
        where: {
          id: existingVote.id,
        },
      });

      return {
        tripId: share.tripId,
        guestId,
        listingId: null,
      };
    }

    await assertListingInTrip(share.tripId, listingId, tx, { requirePotential: true });

    const vote = await tx.tripVote.create({
      data: {
        tripId: share.tripId,
        guestId,
        listingId,
      },
    });

    return {
      tripId: vote.tripId,
      guestId: vote.guestId,
      listingId: vote.listingId,
    };
  });
}
