import type * as cheerio from 'cheerio';
import {
  buildAddress,
  canonicalizeListingUrlShared,
  extractFormattedTextFromElement,
  extractNightlyPriceFromText,
  getAllTextFromSelectors,
  getMetaItempropContent,
  getTextFromSelectors,
  normalizeText,
} from '../importHelpers';
import type { RoomBreakdown, RoomBreakdownEntry } from '../types';
import type {
  ListingImportAdapter,
  ListingImportAdapterHints,
  ListingImportAdapterSelectors,
} from './types';

const VRBO_HOSTS = ['vrbo.com', 'www.vrbo.com'];

const VRBO_SELECTORS: ListingImportAdapterSelectors = {
  title: ['main h1', 'h1[data-stid]', 'h1'],
  address: ['[data-stid="content-h1"] + div', '[data-stid="content-h1"] ~ div', 'main h1 + div'],
  price: [
    '[data-wdio="price-per-night"]',
    '[data-stid="price-summary-message"]',
    '[data-stid="price-summary"]',
  ],
};

// Vrbo prefers explicit "$X per night" over "x night" — the same patterns as
// the default, re-ordered to bias toward Vrbo's typical price-block copy.
const VRBO_NIGHTLY_PRICE_PATTERNS: RegExp[] = [
  /The current price is \$([0-9][0-9,]*)/i,
  /\$([0-9][0-9,]*)\s+per\s+night/i,
  /\$([0-9][0-9,]*)\s*\/\s*night/i,
  /\$([0-9][0-9,]*)\s*x?\s*night/i,
];

function extractVrboDescription($: cheerio.CheerioAPI): string | null {
  const section = $('section')
    .filter(
      (_, element) =>
        normalizeText($(element).find('h2').first().text()) === 'About this property',
    )
    .first();

  if (!section.length) {
    return null;
  }

  const contentBlock = section.clone();
  contentBlock.find('h2').first().remove();

  return extractFormattedTextFromElement(contentBlock.get(0));
}

function extractHints($: cheerio.CheerioAPI): ListingImportAdapterHints {
  const priceSummaryTexts = getAllTextFromSelectors($, [
    '[data-test-id="price-summary-message-line"]',
  ]);
  const priceSummaryText = getTextFromSelectors($, ['[data-test-id="price-summary"]']);
  const headlineText = getTextFromSelectors($, [
    '#product-headline',
    '[data-stid="content-hotel-title"]',
  ]);
  const sourceDescription = extractVrboDescription($);

  return {
    title:
      getTextFromSelectors($, [
        '#product-headline h1',
        '[data-stid="content-hotel-title"] h1',
        'main h1',
      ]) || getMetaItempropContent($, 'name'),
    address: buildAddress([
      getMetaItempropContent($, 'streetAddress'),
      getMetaItempropContent($, 'addressLocality'),
      getMetaItempropContent($, 'addressRegion'),
    ]),
    sourceDescription,
    roomSummaryText: [headlineText, ...priceSummaryTexts.slice(0, 4)].filter(Boolean).join(' '),
    price: extractNightlyPriceFromText(
      [priceSummaryText, ...priceSummaryTexts].filter(Boolean).join('\n'),
      VRBO_NIGHTLY_PRICE_PATTERNS,
    ),
    rawSignals: {
      headlineText,
      priceSummaryTexts,
      priceSummaryText,
      sourceDescription,
    },
  };
}

function extractRoomBreakdown($: cheerio.CheerioAPI): RoomBreakdown | null {
  const rooms: RoomBreakdownEntry[] = $('[data-stid="content-item"]')
    .toArray()
    .flatMap((element) => {
      const item = $(element);
      const name = normalizeText(item.find('h4').first().text());

      if (!name || !/^(Bedroom|Living Room|Office|Den|Loft|Game Room|Studio)\b/i.test(name)) {
        return [];
      }

      const beds =
        item
          .find('.uitk-text, [class*="uitk-text"]')
          .toArray()
          .map((candidate) => normalizeText($(candidate).text()))
          .find(
            (value): value is string =>
              value !== null &&
              value !== name &&
              /\b(beds?|sofa(?:\s+beds?)?|futon|cribs?|mattress(?:es)?)\b/i.test(value),
          ) ?? null;

      return beds ? [{ name, beds }] : [];
    });

  if (rooms.length === 0) return null;

  const summary =
    getAllTextFromSelectors($, ['h3']).find(
      (value) => /\bbedrooms?\b/i.test(value) && /\bsleeps\b/i.test(value),
    ) ?? null;

  return { summary, rooms };
}

function extractNotes($: cheerio.CheerioAPI): string | null {
  const identifier = getMetaItempropContent($, 'identifier');
  return identifier ? `VRBO property id: ${identifier}` : null;
}

export const vrboAdapter: ListingImportAdapter = {
  id: 'VRBO',
  matches(url) {
    const hostname = url.hostname.toLowerCase();
    return VRBO_HOSTS.includes(hostname) || hostname.endsWith('.vrbo.com');
  },
  selectors: VRBO_SELECTORS,
  extractHints,
  extractRoomBreakdown,
  extractNotes,
  cleanupTitle(title) {
    return title.replace(/\s+\|\s+Vrbo\s*$/i, '').trim();
  },
  canonicalizeUrl(url) {
    return canonicalizeListingUrlShared(url, { stripSearch: true });
  },
  extractExternalId(canonicalUrl) {
    const pathSegment = canonicalUrl.pathname.split('/').filter(Boolean).at(-1) ?? null;
    if (!pathSegment) {
      return null;
    }

    const vrboMatch = pathSegment.match(/([0-9]+(?:ha)?)/i);
    return vrboMatch?.[1] ?? pathSegment;
  },
};
