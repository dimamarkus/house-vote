import type { ListingType } from 'db';

/**
 * Client-safe source of truth for ListingType enum values.
 *
 * We keep a local literal tuple here so UI/Zod code doesn't need to pull in
 * the `db` module (which, as a value import, drags the full Prisma client +
 * `pg` driver into client bundles). Only the *type* comes from `db`.
 *
 * The `satisfies` clauses below guarantee that if the Prisma enum ever gains
 * or loses a member, TypeScript fails the build here rather than at runtime.
 */
export const LISTING_TYPE_VALUES = [
  'HOUSE',
  'HOTEL',
  'APARTMENT',
  'CABIN',
  'RESORT',
  'OTHER',
] as const satisfies ReadonlyArray<ListingType>;

export const LISTING_TYPE_LABELS = {
  HOUSE: 'House',
  HOTEL: 'Hotel',
  APARTMENT: 'Apartment',
  CABIN: 'Cabin',
  RESORT: 'Resort',
  OTHER: 'Other',
} as const satisfies Record<ListingType, string>;

export interface ListingTypeOption {
  value: ListingType;
  label: string;
}

export const LISTING_TYPE_OPTIONS: ReadonlyArray<ListingTypeOption> = LISTING_TYPE_VALUES.map(
  (value) => ({ value, label: LISTING_TYPE_LABELS[value] }),
);

/**
 * Types where the "bedroom count" column on a Listing actually represents a
 * room count (e.g. a hotel/resort reservation of 1 room = 1 bedroom from the
 * DB's perspective). Used by the UI to choose between "Bedroom" and "Room".
 *
 * Kept as a literal tuple + string-literal guard so we can still type-check
 * membership without importing ListingType as a value (see file header).
 */
export const HOTEL_LIKE_LISTING_TYPES = [
  'HOTEL',
  'RESORT',
] as const satisfies ReadonlyArray<ListingType>;

export function isHotelLikeListingType(type: ListingType | null | undefined): boolean {
  if (type == null) return false;
  return (HOTEL_LIKE_LISTING_TYPES as ReadonlyArray<ListingType>).includes(type);
}

/**
 * Returns "Bedroom"/"Bedrooms" for house-style listings and "Room"/"Rooms" for
 * hotel-style listings. Pluralized based on count.
 */
export function getBedroomLabel(
  type: ListingType | null | undefined,
  count: number,
): string {
  const singular = isHotelLikeListingType(type) ? 'Room' : 'Bedroom';
  return count === 1 ? singular : `${singular}s`;
}
