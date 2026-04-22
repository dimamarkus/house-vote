import * as cheerio from 'cheerio';
import { pickListingImportAdapter } from './adapters/registry';
import {
  DEFAULT_ADAPTER_SELECTORS,
  EMPTY_ADAPTER_HINTS,
  type ListingImportAdapter,
  type ListingImportAdapterHints,
} from './adapters/types';
import { LISTING_IMPORT_PARSER_VERSION } from './constants';
import {
  buildAddress,
  collectJsonById,
  collectJsonScripts,
  deepCollectByKey,
  extractCount,
  extractNightlyPriceFromText,
  findStructuredListing,
  getAllTextFromSelectors,
  getAttributeFromSelectors,
  getMetaContent,
  getTextFromSelectors,
  normalizePhotoUrls,
  normalizeText,
  normalizeUrlValue,
  parseSrcSetValues,
  parseStructuredImageValues,
  summarizeAmenities,
} from './importHelpers';
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

function resolveAdapter(inputUrl: string): ListingImportAdapter | null {
  return pickListingImportAdapter(inputUrl);
}

function resolveHints(
  adapter: ListingImportAdapter | null,
  $: cheerio.CheerioAPI,
): ListingImportAdapterHints {
  return adapter?.extractHints?.($) ?? EMPTY_ADAPTER_HINTS;
}

export function extractListingCaptureFromHtml(
  html: string,
  inputUrl: string,
): ExtractListingCaptureFromHtmlResult {
  const $ = cheerio.load(html);
  const adapter = resolveAdapter(inputUrl);
  const source: ListingImportSourceValue = adapter?.id ?? 'UNKNOWN';
  const selectors = adapter?.selectors ?? DEFAULT_ADAPTER_SELECTORS;
  const sourceHints = resolveHints(adapter, $);

  const jsonLdBlocks = collectJsonScripts($, 'script[type="application/ld+json"]');
  const structuredListing = findStructuredListing(jsonLdBlocks);
  const nextData = collectJsonById($, '__NEXT_DATA__');
  const pageText = normalizeText($('body').text()) ?? '';

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
          normalizeText(
            (structuredListing.address as JsonRecord).streetAddress as string | undefined,
          ),
          normalizeText(
            (structuredListing.address as JsonRecord).addressLocality as string | undefined,
          ),
          normalizeText(
            (structuredListing.address as JsonRecord).addressRegion as string | undefined,
          ),
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
              ((structuredOffers as JsonRecord).priceSpecification as JsonRecord | undefined)
                ?.price ??
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
      value: extractNightlyPriceFromText(getTextFromSelectors($, selectors.price) ?? ''),
    },
    { label: 'body:text', value: extractNightlyPriceFromText(pageText) },
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
  const adapterNotes = adapter?.extractNotes?.($) ?? null;
  const notesParts = [
    adapterNotes,
    amenitySummary.length > 0 ? `Amenities: ${amenitySummary.join(', ')}` : null,
  ].filter((value): value is string => Boolean(value));

  const metaDescriptionFallback =
    getMetaContent($, 'meta[name="description"]') ??
    getMetaContent($, 'meta[property="og:description"]');
  const sourceDescription =
    sourceHints.sourceDescription ?? normalizeText(metaDescriptionFallback ?? undefined);

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
      priceMeta: sourceHints.priceMeta ?? null,
      bedroomCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+bedrooms?\b/i]),
      bedCount: extractCount(roomSummaryText, [/\b([0-9]+(?:\.[0-9]+)?)\s+beds?\b/i]),
      bathroomCount: extractCount(roomSummaryText, [
        /\b([0-9]+(?:\.[0-9]+)?)\s+(?:bathrooms?|baths?)\b/i,
      ]),
      sourceDescription,
      notes: notesParts.join(' | ') || null,
      imageUrl: photoUrls[0] ?? null,
      photoUrls,
      roomBreakdown: adapter?.extractRoomBreakdown?.($, inputUrl) ?? null,
      rawPayload: {
        parserDebug: debug,
      },
    },
    debug,
  };
}
