'use server';

import { cache } from 'react';
import { ErrorCode } from '@turbodima/core/errors';
import { createErrorResponse } from '@turbodima/core/responses';
import { ApiResponse } from '@turbodima/core/types';
import { likes } from '../db';

/**
 * Server action to fetch distinct guest collaborator names for a trip.
 */
export const getGuestCollaborators = cache(
  async (tripId: string): Promise<ApiResponse<string[]>> => {
    try {
      if (!tripId) {
        return createErrorResponse({
          error: 'Trip ID is required',
          code: ErrorCode.VALIDATION_ERROR,
        });
      }

      // Fetch guest names using the database operation
      const result = await likes.getGuestNamesByTrip(tripId);

      return result;
    } catch (error) {
      return createErrorResponse({
        error,
        code: ErrorCode.PROCESSING_ERROR,
        prefix: 'Failed to get guest collaborators:',
      });
    }
  }
);