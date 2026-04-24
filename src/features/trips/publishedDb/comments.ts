import { db, ListingCommentKind } from 'db';
import {
  assertGuestInTrip,
  assertListingInTrip,
  assertPublishedShare,
  assertTripOwner,
  getShareByTripId,
} from './guards';
import { publishedCommentInclude } from './prismaFragments';

/**
 * Guest-authored pros / cons / comments. Body is trimmed and
 * rejected if empty, so UI clients don't need a pre-submit guard.
 * `comments_open` is checked up front so a closed thread fails
 * before we touch the listing row.
 */
export async function addFeedback(
  token: string,
  guestId: string,
  listingId: string,
  kind: ListingCommentKind,
  body: string,
) {
  const share = await assertPublishedShare(token);

  if (!share.commentsOpen) {
    throw new Error('Comments are closed for this trip.');
  }

  const normalizedBody = body.trim();

  if (!normalizedBody) {
    throw new Error('Comment cannot be empty.');
  }

  await assertGuestInTrip(share.tripId, guestId, db);
  await assertListingInTrip(share.tripId, listingId, db);

  return db.listingComment.create({
    data: {
      tripId: share.tripId,
      guestId,
      listingId,
      kind,
      body: normalizedBody,
    },
    include: publishedCommentInclude,
  });
}

/**
 * Owner-only moderation: hide or un-hide a comment. We fetch the
 * share token here too so the caller can revalidate the public
 * share paths when a comment gets moderated.
 */
export async function setCommentHidden(tripId: string, ownerId: string, commentId: string, hidden: boolean) {
  await assertTripOwner(tripId, ownerId, db);

  const comment = await db.listingComment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      id: true,
      tripId: true,
    },
  });

  if (!comment || comment.tripId !== tripId) {
    throw new Error('Comment not found for this trip.');
  }

  const updatedComment = await db.listingComment.update({
    where: {
      id: comment.id,
    },
    data: {
      hiddenAt: hidden ? new Date() : null,
    },
  });

  const share = await getShareByTripId(tripId, db);

  return {
    comment: updatedComment,
    shareToken: share?.token ?? null,
  };
}
