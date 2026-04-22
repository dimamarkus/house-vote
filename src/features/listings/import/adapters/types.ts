import type * as cheerio from 'cheerio';
import type { ImportedPriceMeta, ListingImportSourceValue, RoomBreakdown } from '../types';

export interface ListingImportAdapterSelectors {
  title: string[];
  address: string[];
  price: string[];
}

export interface ListingImportAdapterHints {
  title: string | null;
  address: string | null;
  sourceDescription: string | null;
  /** Free-text blob that downstream regexes search for bedroom/bed/bath counts. */
  roomSummaryText: string;
  price: string | null;
  /**
   * Optional context about how the scraped `price` was measured. If the
   * adapter can tell whether the number is already per-night (most sites) or
   * a total for a date range (some hotel/OTA flows), populate this so the
   * normalizer can label or derive a per-night price.
   */
  priceMeta?: ImportedPriceMeta | null;
  rawSignals: Record<string, unknown>;
}

/**
 * A listing-source adapter. The orchestrator in `extractListingCaptureFromHtml.ts`
 * drives the shared pipeline (OG tags, JSON-LD, dom image harvesting, debug info)
 * and calls these hooks to let per-source logic contribute targeted hints,
 * per-source room breakdowns, and per-source url canonicalization.
 *
 * Adapters are intentionally small — if the behavior you need is cross-cutting,
 * add it to the orchestrator, not to every adapter.
 */
export interface ListingImportAdapter {
  /** Stable identifier matching a `ListingSource` enum value. */
  id: ListingImportSourceValue;
  /** True when this adapter should handle the given URL. */
  matches(url: URL): boolean;
  /**
   * Optional early rejection. Called before any network fetch. Return a
   * human-readable reason string to stop the import with a targeted error
   * (e.g. "This is a Booking.com search page; open a specific hotel first").
   * Return `null` to let the import proceed.
   */
  rejectInputUrl?(url: URL): string | null;
  /** Per-source selector shortlist for title/address/price text. */
  selectors: ListingImportAdapterSelectors;
  /** Per-source hints; usually beat the generic candidates in the debug picker. */
  extractHints?($: cheerio.CheerioAPI, inputUrl: string): ListingImportAdapterHints;
  /** Per-source structured room breakdown (bedrooms, beds, thumbnails). */
  extractRoomBreakdown?($: cheerio.CheerioAPI, inputUrl: string): RoomBreakdown | null;
  /** Per-source contribution to the free-form `notes` field (e.g. "VRBO property id: …"). */
  extractNotes?($: cheerio.CheerioAPI): string | null;
  /** Strip site-specific suffixes (e.g. " - Airbnb") from the scraped title. */
  cleanupTitle?(title: string): string;
  /** Strip query/fragment so dedupe is stable per source. Mutates and returns the URL. */
  canonicalizeUrl?(url: URL): URL;
  /** Extract the source-specific external id for dedupe (Airbnb room id, VRBO property id). */
  extractExternalId?(canonicalUrl: URL): string | null;
}

export const EMPTY_ADAPTER_HINTS: ListingImportAdapterHints = {
  title: null,
  address: null,
  sourceDescription: null,
  roomSummaryText: '',
  price: null,
  priceMeta: null,
  rawSignals: {},
};

export const DEFAULT_ADAPTER_SELECTORS: ListingImportAdapterSelectors = {
  title: ['main h1', 'h1'],
  address: ['main h2'],
  price: [],
};
