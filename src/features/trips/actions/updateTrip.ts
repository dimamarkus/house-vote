'use server';

import type { Trip } from 'db';
import { ErrorCode, errorResponseDataToString } from '@/core/errors';
import { createErrorResponse } from '@/core/responses';
import { createServerAction } from '@/core/server-actions';
import type { BasicApiResponse } from '@/core/types';
import { TripFormSchema } from '../schemas';
import { trips } from '../db';

export async function updateTrip(
  tripId: string,
  formData: FormData,
): Promise<BasicApiResponse<Trip>> {
  if (!tripId) {
    return createErrorResponse({
      error: 'Trip ID is required for update',
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  return createServerAction({
    input: Object.fromEntries(formData.entries()),
    schema: TripFormSchema,
    requireAuth: true,
    errorPrefix: 'Failed to update trip:',
    validationErrorMessage: 'Invalid trip update form data.',
    handler: async ({ input, userId }) => {
      const result = await trips.update(tripId, userId, input);
      if (!result.success) {
        throw new Error(
          errorResponseDataToString(result.error, 'Unable to update the trip.'),
        );
      }

      return {
        data: result.data,
        revalidate: ['/trips', `/trips/${tripId}`],
      };
    },
  });
}
