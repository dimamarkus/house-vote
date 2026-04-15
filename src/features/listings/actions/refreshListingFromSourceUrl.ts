'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { ErrorCode } from '@/core/errors';
import { validateActionInput } from '@/core/form-data';
import { createErrorResponse, createSuccessResponse } from '@/core/responses';
import { trips } from '@/features/trips/db';
import { LISTING_IMPORT_UNSUPPORTED_SOURCE_MESSAGE } from '../import/constants';
import { getMissingImportedListingFields } from '../import/normalizeImportedListing';
import { scrapeListingMetadataFromUrl } from '../import/scrapeListingMetadataFromUrl';
import { applyNormalizedImportToListingId } from '../import/upsertImportedListing';
import { listings } from '../db';

const RefreshListingInputSchema = z.object({
  listingId: z.string().cuid({ message: 'A valid listing id is required.' }),
});

export async function refreshListingFromSourceUrl(input: unknown) {
  const authData = await auth();
  const userId = authData?.userId;
  if (!userId) {
    return createErrorResponse({
      error: 'User not authenticated',
      code: ErrorCode.UNAUTHENTICATED,
    });
  }

  const validationResult = validateActionInput(
    input as FormData | Record<string, unknown>,
    RefreshListingInputSchema,
  );
  if (!validationResult.success) {
    return validationResult;
  }

  const { listingId } = validationResult.data;

  try {
    const listingResponse = await listings.get(listingId, {
      select: {
        id: true,
        tripId: true,
        url: true,
        addedById: true,
      },
    });

    if (!listingResponse.success || !listingResponse.data) {
      return createErrorResponse({
        error: 'Listing not found.',
        code: ErrorCode.NOT_FOUND,
      });
    }

    const listing = listingResponse.data;
    const trimmedUrl = listing.url?.trim();

    if (!trimmedUrl) {
      return createErrorResponse({
        error: 'This listing has no source URL to refresh.',
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    const tripResult = await trips.get(listing.tripId, { userId });
    if (!tripResult.success) {
      return createErrorResponse({
        error: tripResult.error,
        code: tripResult.code ?? ErrorCode.FORBIDDEN,
      });
    }

    const trip = tripResult.data;
    const isTripOwner = trip.userId === userId;
    const isListingAdder = listing.addedById === userId;

    if (!isTripOwner && !isListingAdder) {
      return createErrorResponse({
        error: 'Only the trip owner or the user who added this listing can refresh it.',
        code: ErrorCode.FORBIDDEN,
      });
    }

    const normalizedListing = await scrapeListingMetadataFromUrl(trimmedUrl);

    if (normalizedListing.source === 'UNKNOWN') {
      return createErrorResponse({
        error: LISTING_IMPORT_UNSUPPORTED_SOURCE_MESSAGE,
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    await applyNormalizedImportToListingId(listingId, normalizedListing);

    const missingFields = getMissingImportedListingFields(normalizedListing);

    revalidatePath(`/trips/${listing.tripId}`);

    return createSuccessResponse({
      data: {
        listingId,
        listingTitle: normalizedListing.title,
        tripId: listing.tripId,
        importStatus: normalizedListing.importStatus,
        missingFields,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to refresh listing:',
    });
  }
}
