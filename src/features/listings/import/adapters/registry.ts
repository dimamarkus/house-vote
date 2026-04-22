import { airbnbAdapter } from './airbnbAdapter';
import { bookingAdapter } from './bookingAdapter';
import { genericAdapter } from './genericAdapter';
import { vrboAdapter } from './vrboAdapter';
import type { ListingImportAdapter } from './types';

/**
 * Ordered list of listing-import adapters. `pickListingImportAdapter` walks
 * this list in order, so put more-specific matchers before generic ones.
 * `genericAdapter` MUST stay last because its `matches()` returns true for
 * any parseable URL.
 */
export const listingImportAdapters: ListingImportAdapter[] = [
  airbnbAdapter,
  vrboAdapter,
  bookingAdapter,
  genericAdapter,
];

export function pickListingImportAdapter(inputUrl: string): ListingImportAdapter | null {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    return null;
  }

  return listingImportAdapters.find((adapter) => adapter.matches(parsed)) ?? null;
}
