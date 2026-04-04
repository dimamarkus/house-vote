import {
  LISTING_IMPORT_UNSUPPORTED_SOURCE_MESSAGE,
} from './constants';
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

  if (normalizedListing.source === 'UNKNOWN') {
    throw new Error(LISTING_IMPORT_UNSUPPORTED_SOURCE_MESSAGE);
  }

  const savedListing = await upsertImportedListing(tripId, normalizedListing, {
    addedById,
  });
  const missingFields = getMissingImportedListingFields(normalizedListing);

  return {
    listingId: savedListing.id,
    listingTitle: normalizedListing.title,
    tripId,
    tripPath: `/trips/${tripId}`,
    source: normalizedListing.source,
    importStatus: normalizedListing.importStatus,
    missingFields,
    debug: extractImportDebugData(normalizedListing.rawImportPayload),
  };
}
