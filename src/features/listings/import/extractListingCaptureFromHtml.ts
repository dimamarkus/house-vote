import * as cheerio from 'cheerio';
import { LISTING_IMPORT_PARSER_VERSION } from './constants';
import { detectListingSource } from './detectListingSource';
import type {
  ListingImportCapture,
  ListingImportDebugField,
  ListingImportDebugInfo,
  ListingImportSourceValue,
} from './types';

type JsonRecord = Record<string, unknown>;

interface LabeledCandidate {
  label: string;
  value: string | null;
}

interface ExtractListingCaptureFromHtmlResult {
  capture: ListingImportCapture;
  debug: ListingImportDebugInfo;
}

interface HtmlNode {
  type: string;
  name?: string;
  data?: string;
  children?: HtmlNode[];
}

function normalizeText(value?: string | null): string | null {
  const trimmedValue = value?.replace(/\s+/g, ' ').trim();
  return trimmedValue ? trimmedValue : null;
}

function getTextFromSelectors($: cheerio.CheerioAPI, selectors: string[]): string | null {
  for (const selector of selectors) {
    const value = normalizeText($(selector).first().text());
    if (value) {
      return value;
    }
  }

  return null;
}

function getAllTextFromSelectors($: cheerio.CheerioAPI, selectors: string[]): string[] {
  return selectors.flatMap((selector) =>
    $(selector)
      .toArray()
      .map((element) => normalizeText($(element).text()))
      .filter((value): value is string => Boolean(value)),
  );
}

function getAttributeFromSelectors(
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

function getMetaContent($: cheerio.CheerioAPI, selector: string, baseUrl?: string): string | null {
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

function getMetaItempropContent($: cheerio.CheerioAPI, itemprop: string): string | null {
  return normalizeText($(`meta[itemprop="${itemprop}"]`).first().attr('content'));
}

function collectJsonScripts($: cheerio.CheerioAPI, selector: string): unknown[] {
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

function collectJsonById($: cheerio.CheerioAPI, scriptId: string): unknown {
  try {
    return JSON.parse($(`#${scriptId}`).first().text() || 'null');
  } catch {
    return null;
  }
}

function findStructuredListing(blocks: unknown[]): JsonRecord | null {
  for (const entry of blocks) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    const typeValue = (entry as JsonRecord)['@type'];
    const typeList = Array.isArray(typeValue) ? typeValue : [typeValue];
    if (typeList.some((value) => value === 'Product' || value === 'LodgingBusiness')) {
      return entry as JsonRecord;
    }
  }

  return null;
}

function deepCollectByKey(
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

function extractCount(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function extractNightlyPriceFromText(text: string, source: ListingImportSourceValue): string | null {
  if (!text) {
    return null;
  }

  const exactNightlyPatterns =
    source === 'VRBO'
      ? [
          /The current price is \$([0-9][0-9,]*)/i,
          /\$([0-9][0-9,]*)\s+per\s+night/i,
          /\$([0-9][0-9,]*)\s*\/\s*night/i,
          /\$([0-9][0-9,]*)\s*x?\s*night/i,
        ]
      : [
          /The current price is \$([0-9][0-9,]*)/i,
          /\$([0-9][0-9,]*)\s*x?\s*night/i,
          /\$([0-9][0-9,]*)\s*\/\s*night/i,
          /\$([0-9][0-9,]*)\s+per\s+night/i,
        ];

  for (const pattern of exactNightlyPatterns) {
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

function normalizeUrlValue(
  value: string | undefined,
  baseUrl: string,
  options?: {
    allowRelative?: boolean;
    allowDataUrl?: boolean;
    excludeUiAssets?: boolean;
  },
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

function parseStructuredImageValues(values: unknown[]): string[] {
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

function normalizePhotoUrls(values: string[], baseUrl: string): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeUrlValue(value, baseUrl, { allowRelative: true }))
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, 20);
}

function parseSrcSetValues(srcset: string | undefined): string[] {
  const normalizedValue = normalizeText(srcset);
  if (!normalizedValue) {
    return [];
  }

  return normalizedValue
    .split(',')
    .map((entry) => normalizeText(entry.split(/\s+/)[0] ?? null))
    .filter((value): value is string => Boolean(value));
}

function getSourceSpecificSelectors(source: ListingImportSourceValue) {
  if (source === 'AIRBNB') {
    return {
      title: ['main h1', 'h1[data-testid]', '[data-section-id="TITLE_DEFAULT"] h1'],
      address: ['main h2', '[data-testid="subtitle"]', '[data-section-id="TITLE_DEFAULT"] h2'],
      price: [
        '[data-testid="book-it-default"]',
        '[data-testid="price-availability-row"]',
        '[data-testid="structured-display-price"]',
      ],
    };
  }

  if (source === 'VRBO') {
    return {
      title: ['main h1', 'h1[data-stid]', 'h1'],
      address: ['[data-stid="content-h1"] + div', '[data-stid="content-h1"] ~ div', 'main h1 + div'],
      price: [
        '[data-wdio="price-per-night"]',
        '[data-stid="price-summary-message"]',
        '[data-stid="price-summary"]',
      ],
    };
  }

  return {
    title: ['main h1', 'h1'],
    address: ['main h2'],
    price: [],
  };
}

function summarizeAmenities(jsonLdBlocks: unknown[]): string[] {
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

interface RoomEntry {
  name: string;
  beds: string;
  imageUrl?: string | null;
}

interface RoomBreakdownResult {
  summary: string | null;
  rooms: RoomEntry[];
}

function extractRoomBreakdownFromVrbo($: cheerio.CheerioAPI): RoomBreakdownResult | null {
  const rooms = $('[data-stid="content-item"]')
    .toArray()
    .map((element) => {
      const item = $(element);
      const name = normalizeText(item.find('h4').first().text());

      if (!name || !/^(Bedroom|Living Room|Office|Den|Loft|Game Room|Studio)\b/i.test(name)) {
        return null;
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

      return beds ? { name, beds } : null;
    })
    .filter((room): room is RoomEntry => Boolean(room));

  if (rooms.length === 0) return null;

  const summary =
    getAllTextFromSelectors($, ['h3']).find(
      (value) => /\bbedrooms?\b/i.test(value) && /\bsleeps\b/i.test(value),
    ) ?? null;

  return { summary, rooms };
}

function extractRoomBreakdownFromAirbnb(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): RoomBreakdownResult | null {
  const carouselRooms: RoomEntry[] = $('[data-section-id="SLEEPING_ARRANGEMENT_WITH_IMAGES"] li[data-key]')
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
          .map((value) => normalizeUrlValue(value, baseUrl, { allowRelative: true, excludeUiAssets: false }))
          .find((value): value is string => Boolean(value)) ??
        null;

      return beds ? [{ name, beds, imageUrl }] : [];
    });

  if (carouselRooms.length > 0) {
    return { summary: null, rooms: carouselRooms };
  }

  const text = normalizeText($('[data-section-id="SLEEPING_ARRANGEMENT_WITH_IMAGES"]').text()) ?? $('body').text();
  const rooms: RoomEntry[] = [];
  const pattern = /(Bedroom \d+)\s+([\d]+ [\w]+ beds?(?:,\s*\d+ [\w]+ beds?)*)/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    rooms.push({ name: match[1], beds: match[2], imageUrl: null });
  }

  if (rooms.length === 0) return null;
  return { summary: null, rooms };
}

function buildAddress(parts: Array<string | null>): string | null {
  return Array.from(new Set(parts.filter((value): value is string => Boolean(value)))).join(', ') || null;
}

function normalizeMultilineText(value?: string | null): string | null {
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

function extractFormattedTextFromElement(element: HtmlNode | null | undefined): string | null {
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

function extractAirbnbDescription($: cheerio.CheerioAPI): string | null {
  const section = $('[data-section-id="DESCRIPTION_DEFAULT"], [data-plugin-in-point-id="DESCRIPTION_DEFAULT"]').first();

  if (!section.length) {
    return null;
  }

  const contentBlock =
    section.find('div[style*="-webkit-line-clamp"]').first().get(0) ??
    section.find('span').first().get(0) ??
    section.get(0);

  return extractFormattedTextFromElement(contentBlock);
}

function extractVrboDescription($: cheerio.CheerioAPI): string | null {
  const section = $('section')
    .filter((_, element) => normalizeText($(element).find('h2').first().text()) === 'About this property')
    .first();

  if (!section.length) {
    return null;
  }

  const contentBlock = section.clone();
  contentBlock.find('h2').first().remove();

  return extractFormattedTextFromElement(contentBlock.get(0));
}

function pickCandidate(candidates: LabeledCandidate[]): {
  value: string | null;
  winner: string | null;
  candidates: LabeledCandidate[];
} {
  const normalizedCandidates = candidates.map((candidate) => ({
    ...candidate,
    value: normalizeText(candidate.value),
  }));
  const winner = normalizedCandidates.find((candidate) => candidate.value) ?? null;

  return {
    value: winner?.value ?? null,
    winner: winner?.label ?? null,
    candidates: normalizedCandidates.filter((candidate) => candidate.value),
  };
}

function toDebugField(value: ReturnType<typeof pickCandidate>): ListingImportDebugField {
  return {
    winner: value.winner,
    candidates: value.candidates,
  };
}

function extractAirbnbHints($: cheerio.CheerioAPI) {
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
    price: extractNightlyPriceFromText(priceContainerText || '', 'AIRBNB'),
    rawSignals: {
      titleSectionText,
      summaryText,
      priceContainerText,
      sourceDescription,
    },
  };
}

function extractVrboHints($: cheerio.CheerioAPI) {
  const priceSummaryTexts = getAllTextFromSelectors($, ['[data-test-id="price-summary-message-line"]']);
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
      'VRBO',
    ),
    rawSignals: {
      headlineText,
      priceSummaryTexts: priceSummaryTexts.slice(0, 6),
      sourceDescription,
    },
  };
}

export function extractListingCaptureFromHtml(
  html: string,
  inputUrl: string,
): ExtractListingCaptureFromHtmlResult {
  const $ = cheerio.load(html);
  const source = detectListingSource(inputUrl);
  const selectors = getSourceSpecificSelectors(source);
  const jsonLdBlocks = collectJsonScripts($, 'script[type="application/ld+json"]');
  const structuredListing = findStructuredListing(jsonLdBlocks);
  const nextData = collectJsonById($, '__NEXT_DATA__');
  const pageText = normalizeText($('body').text()) ?? '';
  const sourceHints =
    source === 'AIRBNB'
      ? extractAirbnbHints($)
      : source === 'VRBO'
        ? extractVrboHints($)
        : {
            title: null,
            address: null,
            sourceDescription: null,
            roomSummaryText: '',
            price: null,
            rawSignals: {},
          };

  const canonicalUrl =
    getAttributeFromSelectors($, ['link[rel="canonical"]'], 'href', inputUrl) ||
    getMetaContent($, 'meta[property="og:url"]', inputUrl) ||
    normalizeUrlValue(inputUrl, inputUrl, { allowRelative: true, excludeUiAssets: false }) ||
    inputUrl;
  const hostname = (() => {
    try {
      return new URL(canonicalUrl).hostname.toLowerCase();
    } catch {
      return null;
    }
  })();

  const structuredImages = parseStructuredImageValues(deepCollectByKey(jsonLdBlocks, ['image']));
  const nextDataImages = parseStructuredImageValues(
    deepCollectByKey(nextData, ['image', 'images', 'pictureUrls']),
  );
  const domImages = $('img')
    .toArray()
    .flatMap((element) => {
      const image = $(element);
      return [
        image.attr('src'),
        image.attr('data-src'),
        image.attr('data-original'),
        ...parseSrcSetValues(image.attr('srcset')),
        ...parseSrcSetValues(image.attr('data-srcset')),
      ].filter((value): value is string => Boolean(value));
    });

  const titleSelection = pickCandidate([
    { label: 'source-hint', value: sourceHints.title },
    { label: 'og:title', value: getMetaContent($, 'meta[property="og:title"]') },
    {
      label: 'structured:name',
      value:
        structuredListing && typeof structuredListing.name === 'string'
          ? structuredListing.name
          : null,
    },
    { label: 'selector:title', value: getTextFromSelectors($, selectors.title) },
    { label: 'document:title', value: $('title').first().text() },
  ]);

  const structuredAddressValue =
    structuredListing &&
    typeof structuredListing.address === 'object' &&
    structuredListing.address &&
    !Array.isArray(structuredListing.address)
      ? buildAddress([
          normalizeText((structuredListing.address as JsonRecord).streetAddress as string | undefined),
          normalizeText((structuredListing.address as JsonRecord).addressLocality as string | undefined),
          normalizeText((structuredListing.address as JsonRecord).addressRegion as string | undefined),
        ])
      : null;

  const addressSelection = pickCandidate([
    { label: 'source-hint', value: sourceHints.address },
    { label: 'structured:address', value: structuredAddressValue },
    { label: 'selector:address', value: getTextFromSelectors($, selectors.address) },
    { label: 'meta:description', value: getMetaContent($, 'meta[property="og:description"]') },
  ]);

  const structuredOffers = deepCollectByKey(structuredListing, ['offers'])[0];
  const structuredPrice =
    structuredOffers && typeof structuredOffers === 'object' && !Array.isArray(structuredOffers)
      ? normalizeText(
          String(
            (structuredOffers as JsonRecord).price ??
              ((structuredOffers as JsonRecord).priceSpecification as JsonRecord | undefined)?.price ??
              '',
          ),
        )
      : null;

  const priceSelection = pickCandidate([
    { label: 'source-hint', value: sourceHints.price },
    {
      label: 'meta:product-price',
      value: getMetaContent($, 'meta[property="product:price:amount"]'),
    },
    { label: 'structured:offers.price', value: structuredPrice },
    {
      label: 'selector:price',
      value: extractNightlyPriceFromText(getTextFromSelectors($, selectors.price) ?? '', source),
    },
    { label: 'body:text', value: extractNightlyPriceFromText(pageText, source) },
  ]);

  const amenitySummary = summarizeAmenities(jsonLdBlocks);
  const photoUrls = normalizePhotoUrls(
    [
      getMetaContent($, 'meta[property="og:image"]', inputUrl),
      ...structuredImages,
      ...nextDataImages,
      ...domImages,
    ].filter((value): value is string => Boolean(value)),
    inputUrl,
  );

  const roomSummaryText = [sourceHints.roomSummaryText, pageText].filter(Boolean).join(' ');
  const notesParts = [
    source === 'VRBO' && getMetaItempropContent($, 'identifier')
      ? `VRBO property id: ${getMetaItempropContent($, 'identifier')}`
      : null,
    amenitySummary.length > 0 ? `Amenities: ${amenitySummary.join(', ')}` : null,
  ].filter((value): value is string => Boolean(value));

  const metaDescriptionFallback =
    getMetaContent($, 'meta[name="description"]') ??
    getMetaContent($, 'meta[property="og:description"]');
  const sourceDescription =
    sourceHints.sourceDescription ??
    normalizeText(metaDescriptionFallback ?? undefined);

  const selectorSignals = {
    title: getAllTextFromSelectors($, selectors.title).slice(0, 3),
    address: getAllTextFromSelectors($, selectors.address).slice(0, 3),
    price: getAllTextFromSelectors($, selectors.price).slice(0, 3),
  };

  const debug: ListingImportDebugInfo = {
    parserVersion: LISTING_IMPORT_PARSER_VERSION,
    source,
    hostname,
    canonicalUrl,
    title: toDebugField(titleSelection),
    address: toDebugField(addressSelection),
    price: toDebugField(priceSelection),
    photoCount: photoUrls.length,
    structuredDataTypes: jsonLdBlocks
      .map((block) => {
        if (!block || typeof block !== 'object' || Array.isArray(block)) {
          return null;
        }

        const typeValue = (block as JsonRecord)['@type'];
        if (Array.isArray(typeValue)) {
          return typeValue.join(', ');
        }

        return typeof typeValue === 'string' ? typeValue : null;
      })
      .filter((value): value is string => Boolean(value))
      .slice(0, 10),
    selectorSignals,
    sourceSignals: sourceHints.rawSignals,
    amenitySummary,
  };

  return {
    capture: {
      source,
      url: canonicalUrl,
      title: titleSelection.value,
      address: addressSelection.value,
      price: priceSelection.value,
      bedroomCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+bedrooms?\b/i]),
      bedCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+beds?\b/i]),
      bathroomCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+(?:bathrooms?|baths?)\b/i]),
      sourceDescription,
      notes: notesParts.join(' | ') || null,
      imageUrl: photoUrls[0] ?? null,
      photoUrls,
      roomBreakdown:
        source === 'VRBO'
          ? extractRoomBreakdownFromVrbo($)
          : source === 'AIRBNB'
            ? extractRoomBreakdownFromAirbnb($, inputUrl)
            : null,
      rawPayload: {
        parserDebug: debug,
      },
    },
    debug,
  };
}
