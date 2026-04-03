/**
 * Server action to fetch multiple listings filtered by Trip ID
 */
'use server';

import { ErrorCode } from '@turbodima/core/errors';
import { createErrorResponse } from '@turbodima/core/responses';
import { auth } from '@clerk/nextjs/server';
import { cache } from 'react';
import { listings } from '../db';
import { GetListingsOptions, ListingsResponse } from '../types';

/**
 * Fetches listings associated with a specific trip ID, handling authentication and errors.
 * Uses React's `cache` for memoization during a single request lifecycle.
 *
 * @param tripId - The ID of the trip.
 * @param options - Optional filtering, sorting, and pagination parameters.
 * @returns A promise that resolves to a ListingsResponse containing the fetched listings or an error.
 */
export const getListingsByTrip = cache(
  async (
    tripId: string,
    options?: GetListingsOptions
  ): Promise<ListingsResponse> => {
    try {
      await auth();

      if (!tripId) {
        return createErrorResponse({
          error: 'Trip ID is required',
          code: ErrorCode.VALIDATION_ERROR
        });
      }

      // Fetch listings using the database operation
      const result = await listings.getManyByTripId(tripId, {
        ...(options || {}),
        // No userId needed here as db layer doesn't use it for this query
      });

      return result;
    } catch (error) {
      // Handle potential errors during the process
      return createErrorResponse({
        error,
        code: ErrorCode.PROCESSING_ERROR,
        prefix: 'Failed to get listings for trip:'
      });
    }
  }
);