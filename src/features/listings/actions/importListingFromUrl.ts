'use server';

import { createServerAction } from '@/core/server-actions';
import { importListingCapture } from '../import/importListingCapture';
import { scrapeListingMetadataFromUrl } from '../import/scrapeListingMetadataFromUrl';
import { UrlImportInputSchema } from '../import/schemas';

export async function importListingFromUrl(inputData: { url: string; tripId: string }) {
  return createServerAction({
    input: inputData,
    schema: UrlImportInputSchema,
    requireAuth: true,
    errorPrefix: 'Failed to import listing from URL:',
    handler: async ({ input, userId }) => {
      const { url, tripId } = input;

      const normalizedListing = await scrapeListingMetadataFromUrl(url);
      const importResult = await importListingCapture({
        tripId,
        capture: {
          source: normalizedListing.source,
          url: normalizedListing.canonicalUrl,
          title: normalizedListing.title,
          address: normalizedListing.address,
          price: normalizedListing.price,
          bedroomCount: normalizedListing.bedroomCount,
          bedCount: normalizedListing.bedCount,
          bathroomCount: normalizedListing.bathroomCount,
          sourceDescription: normalizedListing.sourceDescription,
          notes: normalizedListing.notes,
          imageUrl: normalizedListing.imageUrl,
          photoUrls: normalizedListing.photoUrls,
          rawPayload: normalizedListing.rawImportPayload,
        },
        importMethod: 'URL_FETCH',
        addedById: userId,
      });

      return {
        data: importResult,
        revalidate: [`/trips/${tripId}`],
      };
    },
  });
}
