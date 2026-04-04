'use server';

import 'server-only';

import { ErrorCode } from '@/core/errors';
import { createErrorResponse } from '@/core/responses';
import { cache } from 'react';

import { listings } from '../db';
import { GetListingsOptions, ListingsResponse } from '../types';

/**
 * Server action to fetch listings.
 * Supports optional pagination, filtering, and sorting via search parameters.
 * Memoized with React cache for increased performance.
 * Authentication/Authorization should be handled by the caller or within the DB layer based on searchParams.
 *
 * @param searchParams - Optional search parameters for filtering, pagination, and sorting listings.
 * @returns The listings list response.
 */
export const getListings = cache(
  async (searchParams?: GetListingsOptions): Promise<ListingsResponse> => {
    try {
      // Authentication/Authorization is assumed to be handled by the caller
      // or enforced within listings.getMany based on searchParams (e.g., userId, tripId).

      // Call the database operation directly with the provided search parameters.
      return await listings.getMany(searchParams);

    } catch (error) {
      console.error("Failed to fetch listings:", error);
      return createErrorResponse({
        error,
        code: ErrorCode.DATABASE_ERROR, // More specific error code
        prefix: 'Failed to fetch listings:'
      });
    }
  }
);