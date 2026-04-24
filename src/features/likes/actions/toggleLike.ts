'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from 'db';
import { createErrorResponse } from '@/core/responses';
import { ErrorCode } from '@/core/errors';
import { likes } from '../db';
import { revalidatePath } from 'next/cache';
import { LikeToggleResponse } from "../types";

/**
 * Toggle a like for a listing. If the user has already liked the listing it
 * removes the like; otherwise it adds one.
 */
export async function toggleLike(
  listingId: string
): Promise<LikeToggleResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return createErrorResponse({
        error: "You must be logged in to like listings",
        code: ErrorCode.UNAUTHORIZED,
      });
    }

    const result = await likes.toggle({
      userId,
      listingId,
    });

    if (result.success) {
      // Revalidate the actual trip page the listing lives on, not the literal
      // `[tripId]` string used previously — that form does not revalidate any
      // real route. Resolving the tripId requires a tiny lookup, but it
      // only runs on a successful toggle so the cost is bounded.
      const listing = await db.listing.findUnique({
        where: { id: listingId },
        select: { tripId: true },
      });

      if (listing) {
        revalidatePath(`/trips/${listing.tripId}`);
      }
      revalidatePath(`/trips`);
    }

    return result;
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: "Failed to toggle like:",
    });
  }
}