'use server';

import { TripFormSchema } from '../schemas';
import { errorResponseDataToString } from '@/core/errors';
import { createServerAction } from '@/core/server-actions';
import { trips } from '../db';
import { users } from '../../users/db';
import { TripResponse } from '../types';

export async function createTrip(formData: FormData): Promise<TripResponse> {
  return createServerAction({
    input: Object.fromEntries(formData.entries()),
    schema: TripFormSchema,
    requireAuth: true,
    errorPrefix: 'Failed to create trip:',
    validationErrorMessage: 'Invalid trip form data.',
    handler: async ({ input, userId }) => {
      const userResult = await users.createOrFind(userId);
      if (!userResult.success) {
        throw new Error(
          errorResponseDataToString(userResult.error, 'Unable to resolve the current user.'),
        );
      }

      const result = await trips.create({ ...input, userId });
      if (!result.success) {
        throw new Error(
          errorResponseDataToString(result.error, 'Unable to create the trip.'),
        );
      }

      return {
        data: result.data,
        revalidate: ['/trips'],
      };
    },
  });
}
