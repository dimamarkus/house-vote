import type * as cheerio from 'cheerio';
import {
  extractNightlyPriceFromText,
  getTextFromSelectors,
  normalizeText,
} from '../importHelpers';
import type {
  ListingImportAdapter,
  ListingImportAdapterHints,
  ListingImportAdapterSelectors,
} from './types';
import { DEFAULT_ADAPTER_SELECTORS } from './types';

export interface HotelAdapterTemplateConfig {
  /** Unique slug for this hotel brand. Stays internal until we add enum values. */
  brand: string;
  /** Hostnames this adapter should match (lowercase, with or without www). */
  hosts: string[];
  /**
   * Optional host suffix predicate (e.g. chains that use brand subdomains like
   * `hilton.com`, `hhonors3.hilton.com`, etc.).
   */
  matchesHostSuffix?: boolean;
  /** Site-specific selectors; fall back to DEFAULT_ADAPTER_SELECTORS otherwise. */
  selectors?: Partial<ListingImportAdapterSelectors>;
  /**
   * Regex patterns used to pull a per-night price out of scraped price-block
   * text. Tried in order; the first that matches wins. Keep narrow patterns
   * first (e.g. "$X per night") before broad fallbacks.
   */
  nightlyPricePatterns?: RegExp[];
  /** Suffix to strip from scraped titles (e.g. " | Marriott"). */
  titleSuffix?: RegExp;
  /** Path segment → external id extractor (runs on the canonicalized URL). */
  extractExternalId?: (canonicalUrl: URL) => string | null;
}

/**
 * Factory that produces a `ListingImportAdapter` for a hotel-brand domain.
 *
 * These adapters are **scaffolds**. They intentionally ship with `id: 'OTHER'`
 * so they can be exercised against real pages without requiring a new
 * `ListingSource` enum value / DB migration. Once we collect HTML samples for
 * a given brand and the selectors/price patterns are tuned, flip steps 1–3:
 *
 *   1. Add the brand to the `ListingSource` enum in prisma/schema.prisma and
 *      re-export it from db.ts.
 *   2. Switch `id: 'OTHER'` below to the new enum value (via an override).
 *   3. Register the adapter in `adapters/registry.ts` BEFORE `genericAdapter`.
 *
 * Hotel-specific behavior worth knowing:
 *   - Most hotel rooms should be treated as a single "bedroom" for now (the
 *     room count IS the bedroom count for hotels). When `extractRoomBreakdown`
 *     is left unimplemented, the orchestrator's generic pipeline handles it.
 *   - Per-night price extraction is usually easier on hotel sites than on
 *     Airbnb/Vrbo because most show "USD 189 / night" style text; start with
 *     the default patterns and add site-specific ones only if needed.
 */
export function createHotelAdapterTemplate(
  config: HotelAdapterTemplateConfig,
): ListingImportAdapter {
  const selectors: ListingImportAdapterSelectors = {
    ...DEFAULT_ADAPTER_SELECTORS,
    ...(config.selectors ?? {}),
  };

  const hosts = new Set(config.hosts.map((host) => host.toLowerCase()));
  const nightlyPricePatterns = config.nightlyPricePatterns ?? [
    /\$([0-9][0-9,]*)\s*(?:USD|CAD|EUR|GBP)?\s*(?:\/|per)\s*night/i,
    /\$([0-9][0-9,]*)\s*(?:USD|CAD|EUR|GBP)?\s*(?:a\s+)?night/i,
    /USD\s*([0-9][0-9,]*)\s*(?:\/|per)\s*night/i,
    /from\s+\$([0-9][0-9,]*)\s*(?:\/|per)?\s*night/i,
  ];

  function matchesHost(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    if (hosts.has(hostname)) return true;
    if (!config.matchesHostSuffix) return false;
    for (const host of hosts) {
      if (hostname.endsWith(`.${host}`) || hostname === host) return true;
    }
    return false;
  }

  function extractHints($: cheerio.CheerioAPI): ListingImportAdapterHints {
    const titleText = selectors.title.length
      ? getTextFromSelectors($, selectors.title)
      : null;
    const addressText = selectors.address.length
      ? getTextFromSelectors($, selectors.address)
      : null;
    const priceContainerText =
      (selectors.price.length ? getTextFromSelectors($, selectors.price) : null) ?? '';

    return {
      title: normalizeText(titleText) ?? null,
      address: normalizeText(addressText) ?? null,
      // TODO: brand-specific long-form description selectors (e.g. Marriott
      // uses <section data-testid="hotel-description"> on many properties).
      sourceDescription: null,
      roomSummaryText: priceContainerText,
      price: extractNightlyPriceFromText(priceContainerText, nightlyPricePatterns),
      rawSignals: {
        brand: config.brand,
        titleText,
        addressText,
        priceContainerText,
      },
    };
  }

  // NOTE: `extractRoomBreakdown` is intentionally omitted. Most hotel rooms
  // are a single room with a specific bed layout (e.g. king, two queens), and
  // the generic orchestrator handles a 1-room default fine. When samples land
  // per brand, add an `extractRoomBreakdown` override on the config that pulls
  // the room-type name + bed layout from the reservation summary.

  return {
    // Intentionally 'OTHER' until we add per-brand ListingSource enum values.
    // See the factory docstring for the promotion checklist.
    id: 'OTHER',
    matches: matchesHost,
    selectors,
    extractHints,
    cleanupTitle(title) {
      if (!config.titleSuffix) return title;
      return title.replace(config.titleSuffix, '').trim();
    },
    canonicalizeUrl(url) {
      url.hash = '';
      url.pathname = url.pathname.replace(/\/+$/, '') || '/';
      return url;
    },
    extractExternalId: config.extractExternalId,
  };
}
