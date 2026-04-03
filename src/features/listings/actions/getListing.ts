'use server';

import 'server-only';

import { ErrorCode } from '@turbodima/core/errors';
import { createErrorResponse } from '@turbodima/core/responses';
import { cache } from 'react';

import { listings } from '../db';
import { ListingActionOptions, ListingResponse, ListingGetOptions } from '../types';

/**
 * Server action to fetch a single listing by ID.
 * Memoized with React cache for increased performance.
 * Authentication/Authorization should be handled by the caller or within the DB layer.
 *
 * @param listingId - The ID of the listing to fetch.
 * @param options - Optional parameters including Prisma includes.
 * @returns The listing response.
 */
export const getListing = cache(
  async (
    listingId: string,
    options?: ListingActionOptions
  ): Promise<ListingResponse> => {
    try {
      // Authentication/Authorization is assumed to be handled by the caller
      // or enforced within listings.get based on listingId and user context.

      // Call the database operation directly.
      // Narrow options to ListingGetOptions to satisfy db layer signature
      const getOptions: ListingGetOptions | undefined = options as unknown as ListingGetOptions | undefined;
      return await listings.get(listingId, getOptions);

    } catch (error) {
      console.error(`Failed to fetch listing with ID ${listingId}:`, error);
      return createErrorResponse({
        error,
        code: ErrorCode.DATABASE_ERROR, // More specific error code
        prefix: 'Failed to fetch listing:'
      });
    }
  }
);
