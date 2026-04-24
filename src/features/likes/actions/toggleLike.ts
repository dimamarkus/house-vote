'use server';

import { db } from 'db';
import { z } from 'zod';
import { errorResponseDataToString } from '@/core/errors';
import { createServerAction } from '@/core/server-actions';
import { likes } from '../db';
import { LikeToggleResponse } from '../types';

const toggleLikeSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required.'),
});

/**
 * Toggle a like for a listing. If the user has already liked the listing it
 * removes the like; otherwise it adds one.
 */
export async function toggleLike(listingId: string): Promise<LikeToggleResponse> {
  return createServerAction({
    input: { listingId },
    schema: toggleLikeSchema,
    requireAuth: true,
    errorPrefix: 'Failed to toggle like:',
    handler: async ({ input, userId }) => {
      const result = await likes.toggle({ userId, listingId: input.listingId });
      if (!result.success) {
        throw new Error(
          errorResponseDataToString(result.error, 'Unable to toggle like.'),
        );
      }

      // Resolve the real tripId so revalidatePath can actually invalidate
      // the trip route. Previously this used the literal
      // `'/trips/[tripId]'` string which does not match any concrete route.
      const listing = await db.listing.findUnique({
        where: { id: input.listingId },
        select: { tripId: true },
      });

      const revalidate = listing
        ? [`/trips/${listing.tripId}`, '/trips']
        : ['/trips'];

      return {
        data: result.data,
        revalidate,
      };
    },
  });
}
