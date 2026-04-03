'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { TripFormSchema } from '../schemas';
import { validateActionInput } from '@turbodima/core/form-data';
import { createErrorResponse, createSuccessResponse } from '@turbodima/core/responses';
import type { Trip } from 'db';
import { ErrorCode } from '@turbodima/core/errors';
import { trips } from '../db';
import { BasicApiResponse } from '@turbodima/core/types';

export async function updateTrip(
  tripId: string, // Add tripId as the first argument
  formData: FormData
): Promise<BasicApiResponse<Trip>> {
  // Validate input
  const validationResult = validateActionInput(formData, TripFormSchema);
  if (!validationResult.success) {
    return validationResult;
  }

  // Get validated data
  const data = validationResult.data;

  // Check authentication
  const { userId } = await auth();
  if (!userId) {
    return createErrorResponse({ error: 'Unauthorized', code: ErrorCode.UNAUTHORIZED });
  }

  if (!tripId) {
    return createErrorResponse({ error: 'Trip ID is required for update', code: ErrorCode.VALIDATION_ERROR });
  }

  // Perform database operation using the trips db layer
  try {
    // User existence is implicitly checked by trips.update's auth check
    const result = await trips.update(tripId, userId, data);

    if (!result.success) {
      return result;
    }

    // Revalidate the specific trip page and the list page
    revalidatePath('/trips');
    revalidatePath(`/trips/${tripId}`);

    return createSuccessResponse({ data: result.data });

  } catch (error) {
    console.error("Failed to update trip:", error);
    return createErrorResponse({
      error: 'Failed to update trip. Please try again.',
      code: ErrorCode.DATABASE_ERROR,
    });
  }
}