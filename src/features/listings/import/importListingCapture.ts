import {
  extractImportDebugData,
  getMissingImportedListingFields,
  normalizeImportedListing,
} from './normalizeImportedListing';
import type {
  ListingImportCapture,
  ListingImportMethodValue,
  ListingImportResult,
} from './types';
import { upsertImportedListing } from './upsertImportedListing';

interface ImportListingCaptureOptions {
  tripId: string;
  capture: ListingImportCapture;
  importMethod: ListingImportMethodValue;
  addedById?: string;
}

export async function importListingCapture({
  tripId,
  capture,
  importMethod,
  addedById,
}: ImportListingCaptureOptions): Promise<ListingImportResult> {
  const normalizedListing = normalizeImportedListing(capture, importMethod);

  const { title } = normalizedListing;
  if (title === null) {
    throw new Error(
      "Couldn't extract a title from this listing. The page may be gated behind a login, a bot wall, or missing the usual title markup — try the browser extension on the page in your logged-in browser.",
    );
  }

  const savedListing = await upsertImportedListing(tripId, normalizedListing, {
    addedById,
  });
  const missingFields = getMissingImportedListingFields(normalizedListing);

  return {
    listingId: savedListing.id,
    listingTitle: title,
    tripId,
    tripPath: `/trips/${tripId}`,
    source: normalizedListing.source,
    importStatus: normalizedListing.importStatus,
    missingFields,
    debug: extractImportDebugData(normalizedListing.rawImportPayload),
  };
}
