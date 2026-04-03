'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { ErrorCode } from '@turbodima/core/errors';
import { createErrorResponse } from '@turbodima/core/responses';

import { listings } from '../db';
// Import ListingGetOptions for the authorization check
import { ListingActionOptions, ListingResponse, ListingGetOptions } from '../types';

/**
 * Server action for deleting a listing by ID.
 * Requires authentication and authorization (user must own the listing).
 *
 * @param listingId - The ID of the listing to delete.
 * @param options - Optional parameters for the action (e.g., Prisma includes for the response).
 * @returns Response with the deleted listing data or error details.
 */
export async function deleteListing(
  listingId: string,
  options?: ListingActionOptions // Keep options for potential includes in response
): Promise<ListingResponse> {
  // 1. Authentication Check
  const { userId } = await auth();
  if (!userId) {
    return createErrorResponse({
      error: 'Authentication required to delete a listing.',
      code: ErrorCode.UNAUTHORIZED,
    });
  }

  // 2. Authorization Check: Fetch listing and verify ownership
  let tripIdToRevalidate: string | null = null;
  try {
    const getOptions: ListingGetOptions = { select: { addedById: true, tripId: true } };
    const existingListingResponse = await listings.get(listingId, getOptions);

    if (!existingListingResponse.success || !existingListingResponse.data) {
      // If not found during auth check, it might already be deleted, which is okay.
      // Return a success-like response indicating it's gone.
      // Alternatively, could return NOT_FOUND error, depends on desired UX.
      return createErrorResponse({
        error: 'Listing not found.', // Or treat as success if idempotent delete is desired
        code: ErrorCode.NOT_FOUND,
      });
    }

    if (existingListingResponse.data.addedById !== userId) {
      // TODO: Add more sophisticated auth check? (e.g., allow trip owner/collaborators?)
      // For now, only the user who added it can delete.
      return createErrorResponse({
        error: 'You are not authorized to delete this listing.',
        code: ErrorCode.FORBIDDEN,
      });
    }
    // Store tripId for revalidation after successful delete
    tripIdToRevalidate = existingListingResponse.data.tripId;

    // 3. Call database delete operation
    const deleteResult = await listings.delete(listingId, options);

    // 4. Revalidation (if successful and tripId was found)
    if (deleteResult.success && tripIdToRevalidate) {
      revalidatePath(`/trips/${tripIdToRevalidate}`);
    }

    // 5. Return result
    return deleteResult;

  } catch (error) {
    // 6. Handle potential DB or other errors
    console.error(`Failed to delete listing ${listingId}:`, error);
    return createErrorResponse({
      error: 'Failed to delete listing. Please try again.',
      code: ErrorCode.DATABASE_ERROR,
    });
  }
}