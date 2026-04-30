'use server';

import { z } from 'zod';
import { db } from 'db';
import { errorResponseDataToString } from '@/core/errors';
import { createServerAction } from '@/core/server-actions';
import { trips } from '@/features/trips/db';

const SetListingPrimaryPhotoInputSchema = z.object({
  listingId: z.string().cuid('A valid listing id is required.'),
  photoUrl: z.string().url('A valid photo URL is required.'),
});

export async function setListingPrimaryPhoto(inputData: unknown) {
  return createServerAction({
    input: inputData,
    schema: SetListingPrimaryPhotoInputSchema,
    requireAuth: true,
    errorPrefix: 'Failed to set primary listing photo:',
    handler: async ({ input, userId }) => {
      const listing = await db.listing.findUnique({
        where: {
          id: input.listingId,
        },
        select: {
          id: true,
          tripId: true,
          photos: {
            select: {
              id: true,
              url: true,
              position: true,
            },
            orderBy: {
              position: 'asc',
            },
          },
        },
      });

      if (!listing) {
        throw new Error('Listing not found.');
      }

      const tripResult = await trips.get(listing.tripId, { userId });
      if (!tripResult.success) {
        throw new Error(errorResponseDataToString(
          tripResult.error,
          'You are not authorized to update this listing.',
        ));
      }

      const primaryPhoto = listing.photos.find((photo) => photo.url === input.photoUrl);
      if (!primaryPhoto) {
        throw new Error('Photo does not belong to this listing.');
      }

      const orderedPhotos = [
        primaryPhoto,
        ...listing.photos.filter((photo) => photo.id !== primaryPhoto.id),
      ];

      await db.$transaction(async (tx) => {
        await tx.listing.update({
          where: {
            id: listing.id,
          },
          data: {
            imageUrl: input.photoUrl,
          },
        });

        await tx.listingPhoto.updateMany({
          where: {
            listingId: listing.id,
          },
          data: {
            position: {
              increment: 100_000,
            },
          },
        });

        await Promise.all(
          orderedPhotos.map((photo, position) => (
            tx.listingPhoto.update({
              where: {
                id: photo.id,
              },
              data: {
                position,
              },
            })
          )),
        );
      });

      return {
        data: {
          listingId: listing.id,
          photoUrl: input.photoUrl,
        },
        revalidate: [`/trips/${listing.tripId}`, '/trips'],
      };
    },
  });
}
