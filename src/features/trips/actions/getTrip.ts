/**
 * Server action to fetch a single trip by ID
 */
'use server';

import { ErrorCode } from '@/core/errors';
import { createErrorResponse } from '@/core/responses';
import { cache } from 'react';
import { trips } from '../db';
import { TripResponse, TripGetOptions } from '../types';
import { auth } from '@clerk/nextjs/server';
import { users } from '../../users/db';

/**
 * Fetches a single trip by its ID, handling authentication and authorization.
 * Uses React's `cache` for memoization during a single request lifecycle.
 *
 * @param tripId - The ID of the trip.
 * @param options - Optional database operation options (e.g., includes).
 * @returns A promise that resolves to a TripResponse containing the fetched trip or an error.
 */
export const getTrip = cache(
  async (
    tripId: string,
    options?: TripGetOptions
  ): Promise<TripResponse> => {
    try {
      // Get user ID from Clerk
      const authResult = await auth();
      const userId = authResult.userId;

      // We no longer immediately return an error if userId is null.
      // Authorization checks will happen in the db layer or be based on UI context.

      // Ensure user exists in database ONLY if they are authenticated
      if (userId) {
        const userResult = await users.createOrFind(userId);
        if (!userResult.success) {
          return userResult;
        }
      }

      if (!tripId) {
        return createErrorResponse({
          error: 'Trip ID is required',
          code: ErrorCode.VALIDATION_ERROR
        });
      }

      // Merge provided options with default includes
      // Use TripGetOptions type here as it includes 'owner' and potentially other get-specific options
      const mergedOptions: TripGetOptions = {
        // Use 'include' (singular) and check if options itself exists before accessing properties
        include: {
          ...(options?.include ?? {}),
          collaborators: true, // Always include collaborators for authorization and display
          owner: true // Always include owner details
        },
        // Do not forward tx to avoid cross-package TransactionClient type mismatch
      };

      // Fetch the trip using the database operation, passing potentially null userId within options
      const result = await trips.get(tripId, {
        ...mergedOptions,
        userId: userId ?? undefined,
      } as TripGetOptions);
      return result;

    } catch (error) {
      // Handle potential errors during the process
      return createErrorResponse({
        error,
        code: ErrorCode.PROCESSING_ERROR,
        prefix: 'Failed to get trip:'
      });
    }
  }
);