'use server';

import { cache } from 'react';
import { db } from 'db';
import { ErrorCode } from '@turbodima/core/errors';
import { createErrorResponse, handleDbOperation } from '@turbodima/core/responses';
import { ApiResponse } from '@turbodima/core/types';

/**
 * DB operation to fetch guest names for a trip.
 */
async function fetchGuestNames(tripId: string): Promise<string[]> {
  const guests = await db.tripGuest.findMany({
    where: { tripId },
    select: { guestDisplayName: true },
    orderBy: { createdAt: 'asc' }, // Optional: order by join time
  });
  return guests.map((g: { guestDisplayName: string }) => g.guestDisplayName);
}

/**
 * Server action to fetch all guest display names for a trip.
 */
export const getTripGuests = cache(
  async (tripId: string): Promise<ApiResponse<string[]>> => {
    try {
      if (!tripId) {
        return createErrorResponse({
          error: 'Trip ID is required',
          code: ErrorCode.VALIDATION_ERROR,
        });
      }

      // Use handleDbOperation to wrap the fetch
      return await handleDbOperation(
        () => fetchGuestNames(tripId),
        'Failed to fetch trip guests:',
        ErrorCode.DATABASE_ERROR
      );

    } catch (error) {
      // Catch unexpected errors
      return createErrorResponse({
        error,
        code: ErrorCode.PROCESSING_ERROR,
        prefix: 'Failed to get trip guests:',
      });
    }
  }
);