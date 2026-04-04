'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { createErrorResponse, createSuccessResponse } from '@/core/responses';
import { ErrorCode } from '@/core/errors';
import { validateActionInput } from '@/core/form-data';
import { importListingCapture } from '../import/importListingCapture';
import { scrapeListingMetadataFromUrl } from '../import/scrapeListingMetadataFromUrl';
import { UrlImportInputSchema } from '../import/schemas';

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
    const importResult = await importListingCapture({
      tripId,
      capture: {
        source: normalizedListing.source,
        url: normalizedListing.canonicalUrl,
        title: normalizedListing.title,
        address: normalizedListing.address,
        price: normalizedListing.price,
        bedroomCount: normalizedListing.bedroomCount,
        bedCount: normalizedListing.bedCount,
        bathroomCount: normalizedListing.bathroomCount,
        notes: normalizedListing.notes,
        imageUrl: normalizedListing.imageUrl,
        photoUrls: normalizedListing.photoUrls,
        rawPayload: normalizedListing.rawImportPayload,
      },
      importMethod: 'URL_FETCH',
      addedById: userId,
    });

    revalidatePath(`/trips/${tripId}`);

    return createSuccessResponse({
      data: importResult,
    });

  } catch (error) {
    return createErrorResponse({
      error: error instanceof Error ? error.message : 'An unexpected error occurred during import.',
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to import listing from URL:',
    });
  }
}