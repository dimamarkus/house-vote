'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { ErrorCode } from '@/core/errors';
import { validateActionInput } from '@/core/form-data';
import { createErrorResponse } from '@/core/responses';

import { listings } from '../db';
import { trips } from '../../trips/db';
import { ListingFormDataSchema } from '../schemas';
import { ListingActionOptions, ListingResponse, ListingGetOptions } from '../types';

/**
 * Server action for updating an existing listing.
 * Requires authentication and authorization (user must own the listing).
 *
 * @param listingId - The ID of the listing to update.
 * @param formData - Form data containing the updated listing information.
 * @param options - Optional parameters for the action (e.g., Prisma includes).
 * @returns Response with the updated listing or error details.
 */
export async function updateListing(
  listingId: string,
  formData: FormData,
  options?: ListingActionOptions // Base options for the update call
): Promise<ListingResponse> {
  // 1. Authentication Check
  const { userId } = await auth();
  if (!userId) {
    return createErrorResponse({
      error: 'Authentication required to update a listing.',
      code: ErrorCode.UNAUTHORIZED,
    });
  }

  // 2. Validate input
  const validationResult = validateActionInput(formData, ListingFormDataSchema);
  if (!validationResult.success) {
    return validationResult;
  }

  // 3. Authorization Check: verify user is a member (owner or collaborator) of the trip
  try {
    const getOptions: ListingGetOptions = { select: { tripId: true } };
    const existingListingResponse = await listings.get(listingId, getOptions);

    if (!existingListingResponse.success || !existingListingResponse.data) {
      return createErrorResponse({
        error: 'Listing not found for authorization check.',
        code: ErrorCode.NOT_FOUND,
      });
    }

    const tripResult = await trips.get(existingListingResponse.data.tripId, { userId });
    if (!tripResult.success) {
      return createErrorResponse({
        error: tripResult.error || 'You are not authorized to update this listing.',
        code: tripResult.code || ErrorCode.FORBIDDEN,
      });
    }

    // 4. Prepare data for DB operation. If the user edited the price through
    // the manual form, mark it as MANUAL so downstream displays know the
    // value isn't a scrape artifact.
    const dataToUpdate = {
      ...validationResult.data,
      ...(validationResult.data.price != null && validationResult.data.price !== undefined
        ? { nightlyPriceSource: 'MANUAL' as const }
        : {}),
    };

    // 5. Call database update operation (using the original options for potential includes)
    const updateResult = await listings.update(listingId, dataToUpdate, options);

    // 6. Revalidation (if successful)
    if (updateResult.success && updateResult.data) {
      // Ensure tripId is available for revalidation
      const tripId = existingListingResponse.data.tripId; // Use tripId from initial fetch
      if (typeof tripId === 'string') {
        revalidatePath(`/trips/${tripId}`);
        // Optionally revalidate the specific listing path if one exists
        // revalidatePath(`/listing/${listingId}`);
      }
    }

    // 7. Return result
    return updateResult;

  } catch (error) {
    // 8. Handle potential DB or other errors
    console.error(`Failed to update listing ${listingId}:`, error);
    return createErrorResponse({
      error: 'Failed to update listing. Please try again.',
      code: ErrorCode.DATABASE_ERROR,
    });
  }
}