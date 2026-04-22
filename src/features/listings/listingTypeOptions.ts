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
