'use server';

import { auth } from '@clerk/nextjs/server';
import { createErrorResponse } from '@turbodima/core/responses';
import { ErrorCode } from '@turbodima/core/errors';
import { likes } from '../db';
import { revalidatePath } from 'next/cache';
import { LikeToggleResponse } from "../types";

/**
 * Toggle a like for a listing
 *
 * This action toggles a like for a listing. If the user has already liked the listing,
 * it removes the like. If the user hasn't liked the listing, it adds a like.
 */
export async function toggleLike(
  listingId: string
): Promise<LikeToggleResponse> {
  try {
    // Get current user
    const { userId } = await auth();

    // Check if authenticated
    if (!userId) {
      return createErrorResponse({
        error: "You must be logged in to like listings",
        code: ErrorCode.UNAUTHORIZED,
      });
    }

    // Toggle like in database
    const result = await likes.toggle({
      userId,
      listingId,
    });

    // Return success with created/deleted status
    if (result.success) {
      // Revalidate paths that might show like counts
      revalidatePath(`/trips/[tripId]`);
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