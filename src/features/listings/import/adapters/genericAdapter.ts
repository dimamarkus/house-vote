import { canonicalizeListingUrlShared } from '../importHelpers';
import type { ListingImportAdapter } from './types';
import { DEFAULT_ADAPTER_SELECTORS } from './types';

/**
 * Catch-all fallback. Matches any parseable URL, so the registry MUST keep it
 * at the end of the list (site-specific adapters go first).
 *
 * Intentionally minimal: the shared orchestrator already extracts OG tags,
 * Schema.org JSON-LD (Product / LodgingBusiness / Hotel / etc.), __NEXT_DATA__
 * images, and DOM img tags. That alone produces a usable listing for many
 * hotel / resort / DTC vacation-rental pages. Hotel-specific adapters can
 * later register ahead of this one to tune selectors and prefer per-stay
 * nightly prices.
 */
export const genericAdapter: ListingImportAdapter = {
  id: 'OTHER',
  matches() {
    return true;
  },
  selectors: DEFAULT_ADAPTER_SELECTORS,
  canonicalizeUrl(url) {
    return canonicalizeListingUrlShared(url, { stripTrackingParams: true });
  },
};
