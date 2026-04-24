import type { PublishedTripListingRecord } from '@/features/trips/publishedDb';

export type PublishedListingFormValues = {
  price: string;
  bedroomCount: string;
  bedCount: string;
  bathroomCount: string;
  notes: string;
};

export function formatInitialNumber(value: number | null | undefined): string {
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  return String(value);
}

/**
 * Parse a numeric form field. Returns `null` for an empty string (user cleared
 * the field), `undefined` for an invalid value (e.g. "abc"), or the integer
 * value. Callers should treat `undefined` as a validation failure.
 */
export function parseNumberField(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.trunc(parsed);
}

export function buildInitialValues(
  listing: PublishedTripListingRecord,
): PublishedListingFormValues {
  return {
    price: formatInitialNumber(listing.price),
    bedroomCount: formatInitialNumber(listing.bedroomCount),
    bedCount: formatInitialNumber(listing.bedCount),
    bathroomCount: formatInitialNumber(listing.bathroomCount),
    notes: listing.notes ?? '',
  };
}
