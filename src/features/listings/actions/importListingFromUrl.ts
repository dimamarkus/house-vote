'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Prisma } from 'db';
import { auth } from '@clerk/nextjs/server';
import { createErrorResponse, createSuccessResponse } from '@turbodima/core/responses';
import { ErrorCode } from '@turbodima/core/errors';
import { validateActionInput } from '@turbodima/core/form-data';
import { listings } from '../db';
import { fetchListingMetadata } from './fetchListingMetadata';

const ImportListingSchema = z.object({
  url: z.string().url({ message: 'Invalid URL format.' }),
  tripId: z.string().cuid({ message: 'Valid Trip ID is required.' }),
});

type FetchedDataShape = {
  title?: string | null;
  address?: string | null;
  price?: number | string | null;
  bedroomCount?: number | string | null;
  bedCount?: number | string | null;
  bathroomCount?: number | string | null;
  notes?: string | null;
  imageUrl?: string | null;
};

const safeToNumber = (val: string | number | null | undefined): number | undefined => {
  if (val === null || val === undefined || val === '') return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

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
    const validationResult = validateActionInput(inputData, ImportListingSchema);
    if (!validationResult.success) {
        // If validation fails, validateActionInput already returns a formatted ErrorResponse
        return validationResult;
    }

    // Destructure validated data
    const { url, tripId } = validationResult.data;

    // 3. Fetch metadata
    const metadataResult = await fetchListingMetadata({ url });
    if (!metadataResult || !metadataResult.data) {
      return createErrorResponse({
        error: metadataResult?.error || 'Could not fetch metadata from URL.',
        code: ErrorCode.PROCESSING_ERROR,
      });
    }

    const fetchedData = metadataResult.data as FetchedDataShape;

    // 5. Prepare data for the database layer
    const listingDataToCreate: Prisma.ListingCreateInput = {
      trip: { connect: { id: tripId } },
      url: url,
      title: fetchedData.title || "Untitled Imported Listing",
      status: 'POTENTIAL',
      ...(fetchedData.address && { address: fetchedData.address }),
      ...(safeToNumber(fetchedData.price) !== undefined && { price: safeToNumber(fetchedData.price) }),
      ...(safeToNumber(fetchedData.bedroomCount) !== undefined && { bedroomCount: safeToNumber(fetchedData.bedroomCount) }),
      ...(safeToNumber(fetchedData.bedCount) !== undefined && { bedCount: safeToNumber(fetchedData.bedCount) }),
      ...(safeToNumber(fetchedData.bathroomCount) !== undefined && { bathroomCount: safeToNumber(fetchedData.bathroomCount) }),
      ...(fetchedData.notes && { notes: fetchedData.notes }),
      ...(fetchedData.imageUrl && { imageUrl: fetchedData.imageUrl }),
      // Use the authenticated userId
      addedBy: { connect: { id: userId } }
    };

    // 6. Call the database layer
    const dbResult = await listings.createFromImport(listingDataToCreate);

    // 7. Handle DB result and revalidate
    if (dbResult.success) {
      revalidatePath(`/trips/${tripId}`);
      // Return standard success response
      return createSuccessResponse({ data: { listingId: dbResult.data.id } });
    } else {
      // dbResult is already a formatted ErrorResponse from handleDbOperation
      return dbResult;
    }

  } catch (error) {
    // Catch unexpected errors during the process
    console.error('Unexpected error in importListingFromUrl:', error);
    return createErrorResponse({
      error: 'An unexpected error occurred during import.',
      code: ErrorCode.UNKNOWN_ERROR,
    });
  }
}