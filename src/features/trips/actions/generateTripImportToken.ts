'use server';

import { auth } from '@clerk/nextjs/server';
import { createErrorResponse } from '@turbodima/core/responses';
import { ErrorCode } from '@turbodima/core/errors';
import { trips } from '../db';

export async function generateTripImportToken(tripId: string) {
  const { userId } = await auth();

  if (!userId) {
    return createErrorResponse({
      error: 'Authentication required.',
      code: ErrorCode.UNAUTHORIZED,
    });
  }

  if (!tripId) {
    return createErrorResponse({
      error: 'Trip id is required.',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  return trips.rotateImportToken(tripId, userId);
}
