'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { ErrorCode } from '@/core/errors';
import { validateActionInput } from '@/core/form-data';
import { createErrorResponse } from '@/core/responses';

import { listings } from '../db';
import { ListingFormDataSchema } from '../schemas';
import { ListingResponse } from '../types';

/**
 * Server action for creating a new listing.
 * Requires authentication.
 * Validates input using ListingFormDataSchema.
 */
export async function createListing(
  formData: FormData
): Promise<ListingResponse> {
  // 1. Authentication Check
  const { userId } = await auth();
  if (!userId) {
    return createErrorResponse({
      error: 'Authentication required to create a listing.',
      code: ErrorCode.UNAUTHORIZED,
    });
  }

  // 2. Validate input
  const validationResult = validateActionInput(formData, ListingFormDataSchema);
  if (!validationResult.success) {
    return validationResult;
  }

  // 3. Prepare data for DB operation (include addedById)
  const dataToCreate = {
    ...validationResult.data,
    addedById: userId,
  };

  // 4. Call database operation
  try {
    const result = await listings.create(dataToCreate);

    // 5. Revalidation (if successful)
    if (result.success && result.data) {
      // Ensure tripId is a string before revalidating
      if (typeof result.data.tripId === 'string') {
        revalidatePath(`/trips/${result.data.tripId}`);
      }
    }

    // 6. Return result
    return result;

  } catch (error) {
    // 7. Handle potential DB errors
    console.error("Failed to create listing:", error);
    return createErrorResponse({
      error: 'Failed to create listing. Please try again.',
      code: ErrorCode.DATABASE_ERROR,
    });
  }
}