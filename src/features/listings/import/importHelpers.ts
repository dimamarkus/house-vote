import type * as cheerio from 'cheerio';

type JsonRecord = Record<string, unknown>;

interface HtmlNode {
  type: string;
  name?: string;
  data?: string;
  children?: HtmlNode[];
}

export function normalizeText(value?: string | null): string | null {
  const trimmedValue = value?.replace(/\s+/g, ' ').trim();
  return trimmedValue ? trimmedValue : null;
}

export function normalizeMultilineText(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();

  return normalizedValue || null;
}

export function getTextFromSelectors($: cheerio.CheerioAPI, selectors: string[]): string | null {
  for (const selector of selectors) {
    const value = normalizeText($(selector).first().text());
    if (value) {
      return value;
    }
  }

  return null;
}

export function getAllTextFromSelectors($: cheerio.CheerioAPI, selectors: string[]): string[] {
  return selectors.flatMap((selector) =>
    $(selector)
      .toArray()
      .map((element) => normalizeText($(element).text()))
      .filter((value): value is string => Boolean(value)),
  );
}

export function getAttributeFromSelectors(
  $: cheerio.CheerioAPI,
  selectors: string[],
  attributeName: string,
  baseUrl: string,
): string | null {
  for (const selector of selectors) {
    const value = normalizeUrlValue($(selector).first().attr(attributeName), baseUrl, {
      allowRelative: true,
      allowDataUrl: false,
      excludeUiAssets: false,
    });
    if (value) {
      return value;
    }
  }

  return null;
}

export function getMetaContent(
  $: cheerio.CheerioAPI,
  selector: string,
  baseUrl?: string,
): string | null {
  const value = $(selector).first().attr('content');
  if (!baseUrl) {
    return normalizeText(value);
  }

  return normalizeUrlValue(value, baseUrl, {
    allowRelative: true,
    allowDataUrl: false,
    excludeUiAssets: false,
  });
}

export function getMetaItempropContent($: cheerio.CheerioAPI, itemprop: string): string | null {
  return normalizeText($(`meta[itemprop="${itemprop}"]`).first().attr('content'));
}

export function collectJsonScripts($: cheerio.CheerioAPI, selector: string): unknown[] {
  return $(selector)
    .toArray()
    .flatMap((element) => {
      try {
        const parsed = JSON.parse($(element).text() || 'null');
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [];
      }
    })
    .filter(Boolean);
}

export function collectJsonById($: cheerio.CheerioAPI, scriptId: string): unknown {
  try {
    return JSON.parse($(`#${scriptId}`).first().text() || 'null');
  } catch {
    return null;
  }
}

/**
 * Find the first JSON-LD block whose `@type` matches any of the given schema.org types.
 * Kept generic so hotel adapters can ask for `Hotel` / `LodgingBusiness` / `Accommodation` etc.
 */
export function findStructuredListing(
  blocks: unknown[],
  types: string[] = ['Product', 'LodgingBusiness'],
): JsonRecord | null {
  for (const entry of blocks) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    const typeValue = (entry as JsonRecord)['@type'];
    const typeList = Array.isArray(typeValue) ? typeValue : [typeValue];
    if (typeList.some((value) => typeof value === 'string' && types.includes(value))) {
      return entry as JsonRecord;
    }
  }

  return null;
}

export function deepCollectByKey(
  value: unknown,
  targetKeys: string[],
  collectedValues: unknown[] = [],
): unknown[] {
  if (!value || typeof value !== 'object') {
    return collectedValues;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      deepCollectByKey(item, targetKeys, collectedValues);
    }

    return collectedValues;
  }

  for (const [key, entry] of Object.entries(value as JsonRecord)) {
    if (targetKeys.includes(key)) {
      collectedValues.push(entry);
    }

    deepCollectByKey(entry, targetKeys, collectedValues);
  }

  return collectedValues;
}

export function extractCount(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Default precedence for nightly-price regex matches. Adapters can override the
 * ordering (e.g. Vrbo prefers "per night", Airbnb prefers "x night") by passing
 * their own pattern array.
 */
export const DEFAULT_NIGHTLY_PRICE_PATTERNS: RegExp[] = [
  /The current price is \$([0-9][0-9,]*)/i,
  /\$([0-9][0-9,]*)\s*x?\s*night/i,
  /\$([0-9][0-9,]*)\s*\/\s*night/i,
  /\$([0-9][0-9,]*)\s+per\s+night/i,
];

/**
 * Query params we strip during URL canonicalization so two different
 * marketing links land on the same canonical URL for dedupe.
 */
export const TRACKING_QUERY_PARAMS: readonly string[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
];

interface CanonicalizeListingUrlOptions {
  /** Remove every query param (Airbnb / Vrbo do this — identity lives in the path). */
  stripSearch?: boolean;
  /**
   * When `stripSearch` is false, remove only the known tracking params so the
   * remaining query string (dates, guest counts) stays intact.
   */
  stripTrackingParams?: boolean;
}

/**
 * Shared canonicalizer used by every adapter that has a "URL without hash,
 * without trailing slash, and optionally without query string" canonical form.
 * Booking intentionally does NOT use this — it rewrites the path slug too.
 */
export function canonicalizeListingUrlShared(
  url: URL,
  options: CanonicalizeListingUrlOptions = {},
): URL {
  url.hash = '';
  if (options.stripSearch) {
    url.search = '';
  } else if (options.stripTrackingParams) {
    for (const param of TRACKING_QUERY_PARAMS) {
      url.searchParams.delete(param);
    }
  }
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url;
}

export function extractNightlyPriceFromText(
  text: string,
  patternPriorities: RegExp[] = DEFAULT_NIGHTLY_PRICE_PATTERNS,
): string | null {
  if (!text) {
    return null;
  }

  for (const pattern of patternPriorities) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  const priceLines = text
    .split(/\n+/)
    .map((line) => normalizeText(line))
    .filter((value): value is string => Boolean(value));

  for (const line of priceLines) {
    if (/for\s+\d+\s+nights?/i.test(line) || /fees included/i.test(line)) {
      continue;
    }

    const standaloneMatch = line.match(/\$([0-9][0-9,]*)/);
    if (standaloneMatch?.[1]) {
      return standaloneMatch[1];
    }
  }

  const fallbackMatch = text.match(/\$([0-9][0-9,]*)/);
  return fallbackMatch?.[1] ?? null;
}

interface NormalizeUrlValueOptions {
  allowRelative?: boolean;
  allowDataUrl?: boolean;
  excludeUiAssets?: boolean;
}

export function normalizeUrlValue(
  value: string | undefined,
  baseUrl: string,
  options?: NormalizeUrlValueOptions,
): string | null {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return null;
  }

  if (!options?.allowDataUrl && normalizedValue.startsWith('data:')) {
    return null;
  }

  const lowerCaseValue = normalizedValue.toLowerCase();
  if (options?.excludeUiAssets !== false) {
    const excludedFragments = [
      'avatar',
      'profile',
      '/users/',
      '/user/',
      'logo',
      'icon',
      'flag',
      'mapbox',
      'staticmap',
      'travel-assets',
      'onekey',
      'vrbocare',
      '.svg',
    ];
    if (excludedFragments.some((fragment) => lowerCaseValue.includes(fragment))) {
      return null;
    }
  }

  try {
    const resolvedUrl = options?.allowRelative
      ? new URL(normalizedValue, baseUrl)
      : new URL(normalizedValue);
    return resolvedUrl.toString();
  } catch {
    return null;
  }
}

export function parseStructuredImageValues(values: unknown[]): string[] {
  const images: string[] = [];

  for (const entry of values) {
    if (!entry) {
      continue;
    }

    if (typeof entry === 'string') {
      images.push(entry);
      continue;
    }

    if (Array.isArray(entry)) {
      for (const item of entry) {
        if (typeof item === 'string') {
          images.push(item);
        } else if (item && typeof item === 'object' && typeof (item as JsonRecord).url === 'string') {
          images.push((item as JsonRecord).url as string);
        }
      }
      continue;
    }

    if (typeof entry === 'object' && typeof (entry as JsonRecord).url === 'string') {
      images.push((entry as JsonRecord).url as string);
    }
  }

  return images;
}

export function normalizePhotoUrls(values: string[], baseUrl: string): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeUrlValue(value, baseUrl, { allowRelative: true }))
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, 20);
}

export function parseSrcSetValues(srcset: string | undefined): string[] {
  const normalizedValue = normalizeText(srcset);
  if (!normalizedValue) {
    return [];
  }

  return normalizedValue
    .split(',')
    .map((entry) => normalizeText(entry.split(/\s+/)[0] ?? null))
    .filter((value): value is string => Boolean(value));
}

export function summarizeAmenities(jsonLdBlocks: unknown[]): string[] {
  const amenityValues: string[] = [];

  for (const feature of deepCollectByKey(jsonLdBlocks, ['amenityFeature'])) {
    if (!Array.isArray(feature)) {
      continue;
    }

    for (const item of feature) {
      if (item && typeof item === 'object' && typeof (item as JsonRecord).name === 'string') {
        amenityValues.push((item as JsonRecord).name as string);
      }
    }
  }

  return Array.from(new Set(amenityValues.map((value) => value.trim()).filter(Boolean))).slice(0, 6);
}

export function buildAddress(parts: Array<string | null>): string | null {
  return (
    Array.from(new Set(parts.filter((value): value is string => Boolean(value)))).join(', ') || null
  );
}

export function extractFormattedTextFromElement(element: HtmlNode | null | undefined): string | null {
  if (!element) {
    return null;
  }

  const blockTags = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'section']);
  const extractNodeText = (node: HtmlNode): string => {
    if (node.type === 'text') {
      return node.data ?? '';
    }

    if (node.type !== 'tag') {
      return '';
    }

    const tagName = node.name?.toLowerCase() ?? '';

    if (tagName === 'br') {
      return '\n';
    }

    if (tagName === 'button' || tagName === 'script' || tagName === 'style') {
      return '';
    }

    const childText = (node.children ?? []).map((child) => extractNodeText(child)).join('');

    if (blockTags.has(tagName)) {
      return `${childText}\n\n`;
    }

    return childText;
  };

  return normalizeMultilineText(extractNodeText(element));
}
