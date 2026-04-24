import { db } from 'db';
import { assertGuestInTrip, assertListingInTrip, assertPublishedShare } from './guards';

/**
 * Toggle-style vote: casting the same listing a second time deletes
 * the vote; voting a new listing upserts. Wrapped in a single
 * transaction so the read of the existing vote can't race the
 * write. Returns `listingId: null` when the vote was cleared so
 * the client UI knows to show the un-voted state.
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
        tripId_guestId: {
          tripId: share.tripId,
          guestId,
        },
      },
    });

    if (existingVote?.listingId === listingId) {
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

    const vote = await tx.tripVote.upsert({
      where: {
        tripId_guestId: {
          tripId: share.tripId,
          guestId,
        },
      },
      update: {
        listingId,
      },
      create: {
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
