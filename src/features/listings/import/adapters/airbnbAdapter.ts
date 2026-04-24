import type * as cheerio from 'cheerio';
import {
  canonicalizeListingUrlShared,
  deepCollectByKey,
  extractFormattedTextFromElement,
  extractNightlyPriceFromText,
  getTextFromSelectors,
  normalizeText,
  normalizeUrlValue,
  parseSrcSetValues,
} from '../importHelpers';
import type { RoomBreakdown, RoomBreakdownEntry } from '../types';
import type {
  ListingImportAdapter,
  ListingImportAdapterHints,
  ListingImportAdapterSelectors,
} from './types';

type JsonRecord = Record<string, unknown>;

const AIRBNB_HOSTS = ['airbnb.com', 'www.airbnb.com'];

const AIRBNB_SELECTORS: ListingImportAdapterSelectors = {
  title: ['main h1', 'h1[data-testid]', '[data-section-id="TITLE_DEFAULT"] h1'],
  address: ['main h2', '[data-testid="subtitle"]', '[data-section-id="TITLE_DEFAULT"] h2'],
  price: [
    '[data-testid="book-it-default"]',
    '[data-testid="price-availability-row"]',
    '[data-testid="structured-display-price"]',
  ],
};

function extractAirbnbDescription($: cheerio.CheerioAPI): string | null {
  const section = $(
    '[data-section-id="DESCRIPTION_DEFAULT"], [data-plugin-in-point-id="DESCRIPTION_DEFAULT"]',
  ).first();

  if (!section.length) {
    return null;
  }

  const contentBlock =
    section.find('div[style*="-webkit-line-clamp"]').first().get(0) ??
    section.find('span').first().get(0) ??
    section.get(0);

  return extractFormattedTextFromElement(contentBlock);
}

function extractHints($: cheerio.CheerioAPI): ListingImportAdapterHints {
  const titleSectionText = getTextFromSelectors($, [
    '[data-section-id="TITLE_DEFAULT"]',
    '[data-plugin-in-point-id="TITLE_DEFAULT"]',
  ]);
  const summaryText = getTextFromSelectors($, [
    '[data-section-id="TITLE_DEFAULT"] ol',
    '[data-plugin-in-point-id="TITLE_DEFAULT"] ol',
    '[data-section-id="TITLE_DEFAULT"] h2 + div',
  ]);
  const priceContainerText = getTextFromSelectors($, [
    '[data-testid="book-it-default"]',
    '[data-testid="book-it-hover-target"]',
  ]);
  const sourceDescription = extractAirbnbDescription($);

  return {
    title:
      getTextFromSelectors($, [
        '[data-section-id="TITLE_DEFAULT"] h1',
        '[data-plugin-in-point-id="TITLE_DEFAULT"] h1',
        'main h1',
      ]) ?? null,
    address:
      getTextFromSelectors($, [
        '[data-section-id="TITLE_DEFAULT"] h2',
        '[data-plugin-in-point-id="TITLE_DEFAULT"] h2',
        'main h2',
      ]) ?? null,
    sourceDescription,
    roomSummaryText: summaryText || titleSectionText || '',
    price: extractNightlyPriceFromText(priceContainerText || ''),
    rawSignals: {
      titleSectionText,
      summaryText,
      priceContainerText,
      sourceDescription,
    },
  };
}

function extractRoomBreakdownFromJson($: cheerio.CheerioAPI): RoomBreakdown | null {
  const seenKeys = new Set<string>();
  const arrangementItems: Array<{ title: string; subtitle: string; baseUrl?: string }> = [];

  $('script[type="application/json"]').each((_, el) => {
    if (arrangementItems.length > 0) return;
    const text = $(el).text();
    if (!text.includes('arrangementDetails')) return;

    try {
      const data = JSON.parse(text);
      const collected = deepCollectByKey(data, ['arrangementDetails']);
      for (const details of collected) {
        if (!Array.isArray(details)) continue;
        for (const item of details) {
          if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
          const record = item as JsonRecord;
          const title = typeof record.title === 'string' ? record.title.trim() : '';
          const subtitle = typeof record.subtitle === 'string' ? record.subtitle.trim() : '';
          if (!title || !subtitle) continue;

          const dedupeKey = `${title}\0${subtitle}`;
          if (seenKeys.has(dedupeKey)) {
            continue;
          }
          seenKeys.add(dedupeKey);

          let baseUrl: string | undefined;
          const images = record.images;
          if (Array.isArray(images) && images.length > 0) {
            const first = images[0] as JsonRecord | undefined;
            if (first && typeof first.baseUrl === 'string') {
              baseUrl = first.baseUrl;
            }
          }

          arrangementItems.push({ title, subtitle, baseUrl });
        }
      }
    } catch {
      // malformed JSON
    }
  });

  if (arrangementItems.length === 0) return null;

  const rooms: RoomBreakdownEntry[] = arrangementItems.map(({ title, subtitle, baseUrl }) => ({
    name: title,
    beds: subtitle,
    imageUrl: baseUrl ?? null,
  }));

  return { summary: null, rooms };
}

function extractRoomBreakdown(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): RoomBreakdown | null {
  const carouselRooms: RoomBreakdownEntry[] = $(
    '[data-section-id="SLEEPING_ARRANGEMENT_WITH_IMAGES"] li[data-key]',
  )
    .toArray()
    .flatMap((element) => {
      const item = $(element);
      const name = normalizeText(item.attr('data-key'));

      if (!name) {
        return [];
      }

      const beds =
        item
          .find('div, span')
          .toArray()
          .map((candidate) => normalizeText($(candidate).text()))
          .map((value) => {
            if (!value) {
              return null;
            }

            if (value.startsWith(name)) {
              return normalizeText(value.slice(name.length));
            }

            return value;
          })
          .find(
            (value): value is string =>
              value !== null &&
              value !== name &&
              /\b(beds?|cribs?|bunk\s+beds?|sofa(?:\s+beds?)?|futon|mattress(?:es)?)\b/i.test(value),
          ) ?? null;

      const image = item.find('img').first();
      const imageUrl =
        normalizeUrlValue(image.attr('data-original-uri') ?? image.attr('src'), baseUrl, {
          allowRelative: true,
          excludeUiAssets: false,
        }) ??
        parseSrcSetValues(image.attr('srcset'))
          .map((value) =>
            normalizeUrlValue(value, baseUrl, { allowRelative: true, excludeUiAssets: false }),
          )
          .find((value): value is string => Boolean(value)) ??
        null;

      return beds ? [{ name, beds, imageUrl }] : [];
    });

  if (carouselRooms.length > 0) {
    return { summary: null, rooms: carouselRooms };
  }

  // Airbnb increasingly renders via client-side hydration; fall back to embedded JSON data.
  const jsonResult = extractRoomBreakdownFromJson($);
  if (jsonResult) return jsonResult;

  const text =
    normalizeText($('[data-section-id="SLEEPING_ARRANGEMENT_WITH_IMAGES"]').text()) ??
    $('body').text();
  const rooms: RoomBreakdownEntry[] = [];
  const pattern = /(Bedroom \d+)\s+([\d]+ [\w]+ beds?(?:,\s*\d+ [\w]+ beds?)*)/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    rooms.push({ name: match[1], beds: match[2], imageUrl: null });
  }

  if (rooms.length === 0) return null;
  return { summary: null, rooms };
}

export const airbnbAdapter: ListingImportAdapter = {
  id: 'AIRBNB',
  matches(url) {
    const hostname = url.hostname.toLowerCase();
    return AIRBNB_HOSTS.includes(hostname) || hostname.endsWith('.airbnb.com');
  },
  selectors: AIRBNB_SELECTORS,
  extractHints,
  extractRoomBreakdown,
  cleanupTitle(title) {
    return title.replace(/\s+-\s+Airbnb\s*$/i, '').trim();
  },
  canonicalizeUrl(url) {
    return canonicalizeListingUrlShared(url, { stripSearch: true });
  },
  extractExternalId(canonicalUrl) {
    const roomMatch = canonicalUrl.pathname.match(/\/rooms\/([^/]+)/i);
    return roomMatch?.[1] ?? null;
  },
};
