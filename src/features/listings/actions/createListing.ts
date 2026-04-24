'use server';

import { errorResponseDataToString } from '@/core/errors';
import { createServerAction } from '@/core/server-actions';
import { listings } from '../db';
import { ListingFormDataSchema } from '../schemas';
import { ListingResponse } from '../types';

/**
 * Server action for creating a new listing. Requires authentication.
 * Validates input using ListingFormDataSchema.
 */
export async function createListing(formData: FormData): Promise<ListingResponse> {
  return createServerAction({
    input: Object.fromEntries(formData.entries()),
    schema: ListingFormDataSchema,
    requireAuth: true,
    errorPrefix: 'Failed to create listing:',
    validationErrorMessage: 'Invalid listing form data.',
    handler: async ({ input, userId }) => {
      // Any price supplied through the manual form is, by definition, MANUAL —
      // flag it so downstream price displays can show "set by you" instead of
      // pretending it came from a scrape.
      const dataToCreate = {
        ...input,
        addedById: userId,
        nightlyPriceSource: input.price != null ? ('MANUAL' as const) : null,
      };

      const result = await listings.create(dataToCreate);
      if (!result.success) {
        throw new Error(
          errorResponseDataToString(result.error, 'Unable to create the listing.'),
        );
      }

      const revalidate = typeof result.data.tripId === 'string'
        ? [`/trips/${result.data.tripId}`]
        : [];

      return {
        data: result.data,
        revalidate,
      };
    },
  });
}
