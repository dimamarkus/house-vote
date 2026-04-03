'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { TripFormSchema } from '../schemas';
import { validateActionInput } from '@turbodima/core/form-data';
import { createErrorResponse, createSuccessResponse } from '@turbodima/core/responses';
import { ErrorCode } from '@turbodima/core/errors';
import { trips } from '../db';
import { users } from '../../users/db';
import { TripResponse } from '../types';

export async function createTrip(
  formData: FormData
): Promise<TripResponse> {
  // Validate form data
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

  // Perform database operation using the trips db layer
  try {
    // First ensure the user exists in our database
    const userResult = await users.createOrFind(userId);
    if (!userResult.success) {
      return userResult;
    }

    const result = await trips.create({
      ...data,
      userId: userId,
    });

    if (!result.success) {
      return result;
    }

    revalidatePath('/trips');
    return createSuccessResponse({ data: result.data });

  } catch (error) {
    console.error("Failed to create trip:", error);
    return createErrorResponse({
      error: 'Failed to create trip. Please try again.',
      code: ErrorCode.DATABASE_ERROR,
    });
  }
}

// Optional: Redirect function if needed separately, handled by form component typically
// export async function createTripAndRedirect(formData: FormData) {
//   const result = await createTrip(formData);
//   if (result.success) {
//     redirect('/trips');
//   } else {
//     // Handle error display, maybe redirect back to form with error state?
//     // This pattern might be better handled client-side with useActionState
//   }
// }