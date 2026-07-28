'use server';

import { createServerAction } from '@/core/server-actions';
import {
  extractImportDebugData,
  getMissingImportedListingFields,
} from '../import/normalizeImportedListing';
import { scrapeListingMetadataFromUrl } from '../import/scrapeListingMetadataFromUrl';
import { UrlImportInputSchema } from '../import/schemas';
import { upsertImportedListing } from '../import/upsertImportedListing';

export async function importListingFromUrl(inputData: { url: string; tripId: string }) {
  return createServerAction({
    input: inputData,
    schema: UrlImportInputSchema,
    requireAuth: true,
    errorPrefix: 'Failed to import listing from URL:',
    handler: async ({ input, userId }) => {
      const { url, tripId } = input;

      const normalizedListing = await scrapeListingMetadataFromUrl(url);
      const { title } = normalizedListing;
      if (title === null) {
        throw new Error(
          "Couldn't extract a title from this listing. The page may be gated behind a login, a bot wall, or missing the usual title markup — try the browser extension on the page in your logged-in browser.",
        );
      }

      const savedListing = await upsertImportedListing(tripId, normalizedListing, {
        addedById: userId,
      });
      const missingFields = getMissingImportedListingFields(normalizedListing);

      return {
        data: {
          listingId: savedListing.id,
          listingTitle: title,
          tripId,
          tripPath: `/trips/${tripId}`,
          source: normalizedListing.source,
          importStatus: normalizedListing.importStatus,
          missingFields,
          debug: extractImportDebugData(normalizedListing.rawImportPayload),
        },
        revalidate: [`/trips/${tripId}`],
      };
    },
  });
}
