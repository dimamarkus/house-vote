import type * as cheerio from 'cheerio';
import {
  extractFormattedTextFromElement,
  normalizeText,
} from '../importHelpers';
import type { ImportedPriceMeta } from '../types';
import type {
  ListingImportAdapter,
  ListingImportAdapterHints,
  ListingImportAdapterSelectors,
} from './types';

const BOOKING_HOSTS = ['booking.com', 'www.booking.com'];

const BOOKING_SELECTORS: ListingImportAdapterSelectors = {
  title: ['#hp_hotel_name h2.pp-header__title', 'h2.pp-header__title', '[data-testid="breadcrumb-current"]'],
  address: ['[data-testid="PropertyHeaderAddressDesktop-wrapper"]'],
  price: ['.js-average-per-night-price', '[data-testid="price-and-discounted-price"]'],
};

/**
 * Pull the first direct text-node value from a Cheerio selection. Booking
 * nests tooltip/rating content inside the same container as the address, so
 * the straight `.text()` call would glue "150 W 48th Street…" together with
 * "Excellent location – 9.6/10 (3728 reviews)…". Cloning and dropping child
 * elements leaves only the top-level text we actually want.
 */
function getFirstDirectTextFromSelectors(
  $: cheerio.CheerioAPI,
  selectors: string[],
): string | null {
  for (const selector of selectors) {
    const matches = $(selector).first();
    if (!matches.length) continue;

    const clone = matches.clone();
    clone.children().remove();
    const text = normalizeText(clone.text());
    if (text) return text;
  }
  return null;
}

/**
 * Booking.com's street address lives a few levels deep in the
 * PropertyHeaderAddressDesktop-wrapper. The direct text of the wrapper is
 * empty — the address itself is the first text child of a nested div. Walking
 * the DOM and picking the first descendant whose direct text looks like an
 * address keeps us resilient to their periodic class-hash churn.
 */
function extractBookingAddress($: cheerio.CheerioAPI): string | null {
  const wrapper = $('[data-testid="PropertyHeaderAddressDesktop-wrapper"]').first();
  if (!wrapper.length) return null;

  let addressCandidate: string | null = null;

  wrapper.find('div, span, a').each((_, el) => {
    if (addressCandidate) return;
    const clone = $(el).clone();
    clone.children().remove();
    const directText = normalizeText(clone.text());
    if (!directText) return;
    // Heuristic: "<street>, <city>, <region-or-country>" almost always has at
    // least two commas on Booking. Street-number prefixes (e.g. "150 W 48th…")
    // make the false-positive rate for tooltip copy effectively zero.
    if ((directText.match(/,/g) ?? []).length >= 2 && /\d/.test(directText)) {
      addressCandidate = directText;
    }
  });

  return addressCandidate;
}

function parseRawPricePerNight(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Booking shows one price block per rate option; we want the cheapest per-night
 * rate on the page, which mirrors the behavior of the competitor adapters.
 * `data-price-per-night-raw` is already a decimal so we round for the Int
 * `Listing.price` column but keep the raw string in `rawSignals` for debugging.
 *
 * If the data attribute is missing we return null rather than scraping the
 * visible "$285" text: when Booking changes their markup we want the import
 * to surface as PARTIAL so we can fix the selector, not invent a wrong price
 * from an unrelated dollar amount on the page.
 */
function extractCheapestNightly($: cheerio.CheerioAPI): {
  dollars: number | null;
  rawAttr: string | null;
} {
  let cheapest: number | null = null;
  let cheapestRaw: string | null = null;

  $('.js-average-per-night-price').each((_, el) => {
    const rawAttr = $(el).attr('data-price-per-night-raw');
    const parsed = parseRawPricePerNight(rawAttr);
    if (parsed !== null && (cheapest === null || parsed < cheapest)) {
      cheapest = parsed;
      cheapestRaw = rawAttr ?? null;
    }
  });

  return {
    dollars: cheapest === null ? null : Math.round(cheapest),
    rawAttr: cheapestRaw,
  };
}

function addDaysIso(isoStart: string, days: number): string | null {
  const start = new Date(isoStart);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days);
  return end.toISOString().slice(0, 10);
}

/**
 * Booking encodes the stay context several places: a hidden `<input name="checkin">`,
 * the page URL's `checkin`/`checkout` query params, and a human-readable
 * "X nights" label next to each price block. We prefer the URL (authoritative
 * for the viewer's session), then fall back to the DOM.
 */
function extractStayMeta(
  $: cheerio.CheerioAPI,
  inputUrl: string,
): { startDate: string | null; endDate: string | null; nights: number | null } {
  let startDate: string | null = null;
  let endDate: string | null = null;

  try {
    const url = new URL(inputUrl);
    startDate = url.searchParams.get('checkin');
    endDate = url.searchParams.get('checkout');
  } catch {
    // non-URL input is handled upstream, but we still want DOM fallbacks
  }

  if (!startDate) {
    startDate = normalizeText($('input[name="checkin"]').first().attr('value')) ?? null;
  }
  if (!endDate) {
    endDate = normalizeText($('input[name="checkout"]').first().attr('value')) ?? null;
  }

  let nights: number | null = null;
  const nightsText = $('.bui-price-display__label')
    .toArray()
    .map((el) => normalizeText($(el).text()))
    .find((text) => text && /\b\d+\s+nights?\b/i.test(text));
  const nightsMatch = nightsText?.match(/\b(\d+)\s+nights?\b/i);
  if (nightsMatch) {
    nights = Number.parseInt(nightsMatch[1], 10);
  }

  if (!endDate && startDate && nights) {
    endDate = addDaysIso(startDate, nights);
  }

  return { startDate, endDate, nights };
}

function extractBookingDescription($: cheerio.CheerioAPI): string | null {
  const element = $('[data-testid="property-description"]').first().get(0);
  return extractFormattedTextFromElement(element ?? null);
}

function extractBookingHotelId($: cheerio.CheerioAPI): string | null {
  return normalizeText($('input[name="hotel_id"]').first().attr('value')) ?? null;
}

function extractHints(
  $: cheerio.CheerioAPI,
  inputUrl: string,
): ListingImportAdapterHints {
  const title = getFirstDirectTextFromSelectors($, BOOKING_SELECTORS.title);
  const address = extractBookingAddress($);
  const { dollars, rawAttr } = extractCheapestNightly($);
  const stayMeta = extractStayMeta($, inputUrl);
  const description = extractBookingDescription($);
  const hotelId = extractBookingHotelId($);

  // Booking's per-night number is already a nightly rate, so tag it as NIGHTLY
  // rather than leaving the normalizer to treat a total as the price. We still
  // forward start/end so the UI can show "quoted for May 21–23".
  const priceMeta: ImportedPriceMeta | null =
    dollars !== null
      ? {
          basis: 'NIGHTLY',
          nights: stayMeta.nights,
          startDate: stayMeta.startDate,
          endDate: stayMeta.endDate,
        }
      : null;

  return {
    title: title ?? null,
    address: address ?? null,
    sourceDescription: description,
    roomSummaryText: '',
    price: dollars !== null ? String(dollars) : null,
    priceMeta,
    rawSignals: {
      hotelId,
      rawPricePerNight: rawAttr,
      checkin: stayMeta.startDate,
      checkout: stayMeta.endDate,
      nights: stayMeta.nights,
    },
  };
}

export const bookingAdapter: ListingImportAdapter = {
  id: 'BOOKING',
  matches(url) {
    const hostname = url.hostname.toLowerCase();
    return BOOKING_HOSTS.includes(hostname) || hostname.endsWith('.booking.com');
  },
  rejectInputUrl(url) {
    // Search / city / region landing pages list dozens of hotels and don't map
    // to a single listing. Bail early with a targeted error so the user knows
    // to click through to a specific property first.
    const path = url.pathname.toLowerCase();
    if (path.startsWith('/searchresults')) {
      return 'This looks like a Booking.com search page. Open a specific hotel and paste that URL instead.';
    }
    if (path === '/' || path.startsWith('/index') || path.startsWith('/city') || path.startsWith('/region')) {
      return 'This Booking.com URL points to a list of properties, not one hotel. Open a specific hotel and paste that URL instead.';
    }
    return null;
  },
  selectors: BOOKING_SELECTORS,
  extractHints,
  cleanupTitle(title) {
    return title.replace(/\s*[-–|]\s*Booking\.com\s*$/i, '').trim();
  },
  canonicalizeUrl(url) {
    url.hash = '';
    // Booking loves query-string noise (labels, sids, affiliate ids). Strip
    // everything except what's useful for dedupe; the `hotel_id` lives in the
    // path slug so we don't need to preserve query params to identify the hotel.
    url.search = '';
    url.pathname = url.pathname.replace(/\.[a-z-]+\.html$/i, '.html');
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url;
  },
  extractExternalId(canonicalUrl) {
    // Canonical path is `/hotel/<country>/<slug>.html` — the slug is a stable
    // external id we can dedupe against. We intentionally don't use the
    // `hotel_id` hidden input because `extractExternalId` runs URL-only.
    const match = canonicalUrl.pathname.match(/\/hotel\/[^/]+\/([^/]+?)(?:\.html)?$/i);
    return match?.[1] ?? null;
  },
};
