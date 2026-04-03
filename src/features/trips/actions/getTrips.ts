'use server';

import { auth } from '@clerk/nextjs/server';
import type { Trip } from 'db';
import { createErrorResponse, createSuccessResponse } from '@turbodima/core/responses';
import { ErrorCode } from '@turbodima/core/errors';
import { cache } from 'react';
import { trips } from '../db';
import { ApiResponse } from '@turbodima/core/types';

// Use standard ApiResponse type
type GetTripsResponse = ApiResponse<Trip[]>;

// Interface for options
interface GetTripsOptions {
  includeListings?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name' | 'startDate';
  sortOrder?: 'asc' | 'desc';
}

// Cache the query for the duration of the request
export const getTrips = cache(async (
  options: GetTripsOptions = {}
): Promise<GetTripsResponse> => {
  try {
    // Check authentication
    const { userId } = await auth();

    if (!userId) {
      // Use createErrorResponse
      return createErrorResponse({
        error: 'You must be logged in to view trips',
        code: ErrorCode.UNAUTHORIZED
      });
    }

    // Set defaults
    const {
      includeListings = false,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // Use the database layer to fetch trips
    const result = await trips.getByUser(userId, {
      page,
      limit,
      sortBy,
      sortOrder,
      includes: {
        listings: includeListings
      }
    });

    // Check if operation succeeded
    if (!result.success) {
      // Return the result directly if it failed (already an ErrorResponse)
      return result;
    }

    // Use createSuccessResponse
    return createSuccessResponse({ data: result.data });

  } catch (error) {
    console.error('Failed to fetch trips:', error);
    // Use createErrorResponse
    return createErrorResponse({
      error: 'Failed to load trips. Please try again.',
      code: ErrorCode.DATABASE_ERROR
    });
  }
});