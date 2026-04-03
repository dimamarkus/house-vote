'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { createErrorResponse, createSuccessResponse } from '@turbodima/core/responses';
import { ErrorCode } from '@turbodima/core/errors';
import { validateActionInput } from '@turbodima/core/form-data';
import { scrapeListingMetadataFromUrl } from '../import/scrapeListingMetadataFromUrl';
import { UrlImportInputSchema } from '../import/schemas';
import { upsertImportedListing } from '../import/upsertImportedListing';

// Standard server action function
export async function importListingFromUrl(inputData: { url: string; tripId: string }) {

  try {
    // 1. Authentication
    const authData = await auth();
    const userId = authData?.userId;
    if (!userId) {
      return createErrorResponse({
        error: 'User not authenticated',
        code: ErrorCode.UNAUTHENTICATED,
      });
    }

    // 2. Validation (using validateActionInput)
    // validateActionInput expects FormData or object, so we pass the input directly
    const validationResult = validateActionInput(inputData, UrlImportInputSchema);
    if (!validationResult.success) {
        // If validation fails, validateActionInput already returns a formatted ErrorResponse
        return validationResult;
    }

    // Destructure validated data
    const { url, tripId } = validationResult.data;

    const normalizedListing = await scrapeListingMetadataFromUrl(url);
    const savedListing = await upsertImportedListing(tripId, normalizedListing, {
      addedById: userId,
    });

    revalidatePath(`/trips/${tripId}`);

    return createSuccessResponse({
      data: {
        listingId: savedListing.id,
        importStatus: normalizedListing.importStatus,
      },
    });

  } catch (error) {
    // Catch unexpected errors during the process
    console.error('Unexpected error in importListingFromUrl:', error);
    return createErrorResponse({
      error: 'An unexpected error occurred during import.',
      code: ErrorCode.UNKNOWN_ERROR,
    });
  }
}