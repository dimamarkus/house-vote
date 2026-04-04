'use server';

import { auth } from '@clerk/nextjs/server';
import { ErrorCode } from '@/core/errors';
import { createErrorResponse, createSuccessResponse } from '@/core/responses';
import { likes } from '../db';
import { HasLikedResponse } from '../types';

/**
 * Check if the current user has liked a specific listing
 */
export async function checkUserLike(
  listingId: string
): Promise<HasLikedResponse> {
  try {
    // Get current user
    const { userId } = await auth();

    // If not authenticated, user hasn't liked it
    if (!userId) {
      // Return success: false, data: false (user cannot have liked if not logged in)
      return createSuccessResponse({ data: false });
    }

    // Check if user has liked the listing
    const result = await likes.hasLiked(userId, listingId);

    if (!result.success) {
      // Propagate the error response from the DB layer if it failed
      return result;
    }

    // Use createSuccessResponse
    return createSuccessResponse({ data: result.data.hasLiked });

  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: "Failed to check like status:",
    });
  }
}