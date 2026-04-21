import { airbnbAdapter } from './airbnbAdapter';
import { vrboAdapter } from './vrboAdapter';
import type { ListingImportAdapter } from './types';

/**
 * Ordered list of listing-import adapters. `pickListingImportAdapter` walks
 * this list in order, so put more-specific matchers before generic ones.
 * A follow-up PR will append a `genericAdapter` that matches any URL as a fallback.
 */
export const listingImportAdapters: ListingImportAdapter[] = [airbnbAdapter, vrboAdapter];

export function pickListingImportAdapter(inputUrl: string): ListingImportAdapter | null {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    return null;
  }

  return listingImportAdapters.find((adapter) => adapter.matches(parsed)) ?? null;
}
