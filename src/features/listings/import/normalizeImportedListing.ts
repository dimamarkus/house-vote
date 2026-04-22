import { pickListingImportAdapter } from './adapters/registry';
import type { ListingImportAdapter } from './adapters/types';
import type {
  ImportedPriceMeta,
  ListingImportCapture,
  ListingImportDebugInfo,
  ListingImportMethodValue,
  ListingImportSourceValue,
  ListingImportStatusValue,
  NightlyPriceSourceValue,
  NormalizedImportedListing,
  RoomBreakdown,
} from './types';
import { detectListingSource } from './detectListingSource';

function normalizeText(value?: string | null): string | null {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function parseNumberish(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }

  const cleanedValue = String(value).replace(/[^0-9.]/g, '');
  if (!cleanedValue) {
    return null;
  }

  const numericValue = Number(cleanedValue);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.round(numericValue);
}

function parseImportedPrice(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue) {
    return null;
  }

  if (/^[\d,.]+$/.test(normalizedValue)) {
    return parseNumberish(normalizedValue);
  }

  const currencyMatch = normalizedValue.match(/\$([0-9][0-9,]*(?:\.\d+)?)/);
  if (currencyMatch?.[1]) {
    return parseNumberish(currencyMatch[1]);
  }

  return null;
}

function normalizePhotoUrls(imageUrl?: string | null, photoUrls?: string[]): string[] {
  const uniqueUrls = new Set<string>();

  for (const candidate of [imageUrl ?? null, ...(photoUrls ?? [])]) {
    const trimmedValue = candidate?.trim();
    if (!trimmedValue) {
      continue;
    }

    try {
      const normalizedUrl = new URL(trimmedValue).toString();
      uniqueUrls.add(normalizedUrl);
    } catch {
      continue;
    }
  }

  return [...uniqueUrls];
}

function deriveBedCountFromRoomBreakdown(
  roomBreakdown?: ListingImportCapture['roomBreakdown'],
): number | null {
  if (!roomBreakdown?.rooms?.length) {
    return null;
  }

  let totalBeds = 0;

  for (const room of roomBreakdown.rooms) {
    const matches = room.beds.match(/\b\d+\b/g) ?? [];
    for (const match of matches) {
      totalBeds += Number(match);
    }
  }

  return totalBeds > 0 ? totalBeds : null;
}

const TRACKING_QUERY_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
];

function canonicalizeListingUrl(inputUrl: string, adapter: ListingImportAdapter | null): string {
  const url = new URL(inputUrl);
  url.hash = '';

  if (adapter?.canonicalizeUrl) {
    return adapter.canonicalizeUrl(url).toString();
  }

  for (const param of TRACKING_QUERY_PARAMS) {
    url.searchParams.delete(param);
  }
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';

  return url.toString();
}

function extractSourceExternalId(
  canonicalUrl: string,
  adapter: ListingImportAdapter | null,
): string | null {
  if (!adapter?.extractExternalId) {
    return null;
  }

  try {
    return adapter.extractExternalId(new URL(canonicalUrl));
  } catch {
    return null;
  }
}

function cleanupImportedTitle(
  value: string | null,
  adapter: ListingImportAdapter | null,
): string | null {
  if (!value) {
    return null;
  }

  const normalizedValue = adapter?.cleanupTitle ? adapter.cleanupTitle(value) : value.trim();
  return normalizedValue || null;
}

function determineImportStatus(input: {
  title: string | null;
  address: string | null;
  price: number | null;
  photoUrls: string[];
}): ListingImportStatusValue {
  const qualitySignals = [
    input.title,
    input.address,
    input.price !== null ? String(input.price) : null,
    input.photoUrls[0] ?? null,
  ].filter(Boolean);

  if (qualitySignals.length >= 3) {
    return 'COMPLETE';
  }

  if (qualitySignals.length >= 1) {
    return 'PARTIAL';
  }

  return 'FAILED';
}

/** Re-run after merging refreshed scrape data with existing DB values (e.g. `keepExisting`). */
export function recalculateImportStatus(
  listing: Pick<NormalizedImportedListing, 'title' | 'address' | 'price' | 'photoUrls'>,
): ListingImportStatusValue {
  return determineImportStatus({
    title: listing.title,
    address: listing.address,
    price: listing.price,
    photoUrls: listing.photoUrls,
  });
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

interface DerivedNightlyPrice {
  /** Per-night price in whole dollars, or null if we couldn't compute one. */
  price: number | null;
  /** How we arrived at that price. Null when we had no price at all. */
  source: NightlyPriceSourceValue | null;
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Converts a raw scraped price + optional `priceMeta` into a per-night price
 * plus provenance metadata. Defaults to assuming the raw price is already
 * nightly (matches current Airbnb/Vrbo behavior) unless `priceMeta.basis`
 * explicitly says it's a total for a multi-night stay.
 */
function deriveNightlyPrice(
  rawPrice: number | null,
  priceMeta: ImportedPriceMeta | null | undefined,
): DerivedNightlyPrice {
  const startDate = parseIsoDate(priceMeta?.startDate);
  const endDate = parseIsoDate(priceMeta?.endDate);

  if (rawPrice === null) {
    return { price: null, source: null, startDate, endDate };
  }

  if (priceMeta?.basis === 'TOTAL') {
    const nights =
      priceMeta.nights ??
      (startDate && endDate
        ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000))
        : null);

    if (nights && nights > 0) {
      return {
        price: Math.round(rawPrice / nights),
        source: 'DERIVED_FROM_TOTAL',
        startDate,
        endDate,
      };
    }
    // Couldn't divide — fall through and treat as nightly, but flag as
    // DERIVED so downstream knows the dollar amount is suspect. This is
    // rare; better than silently dropping the price.
    return { price: rawPrice, source: 'DERIVED_FROM_TOTAL', startDate, endDate };
  }

  // Default: the scraped number is already a per-night rate.
  return { price: rawPrice, source: 'SCRAPED_NIGHTLY', startDate, endDate };
}

function buildFallbackTitle(source: ListingImportSourceValue, sourceExternalId: string | null): string {
  const label =
    source === 'AIRBNB'
      ? 'Airbnb Listing'
      : source === 'VRBO'
        ? 'Vrbo Listing'
        : 'Imported Listing';

  return sourceExternalId ? `${label} ${sourceExternalId}` : label;
}

export function normalizeImportedListing(
  capture: ListingImportCapture,
  importMethod: ListingImportMethodValue,
): NormalizedImportedListing {
  const adapter = pickListingImportAdapter(capture.url);
  const source = capture.source ?? adapter?.id ?? detectListingSource(capture.url);
  const canonicalUrl = canonicalizeListingUrl(capture.url, adapter);
  const sourceExternalId = extractSourceExternalId(canonicalUrl, adapter);
  const address = normalizeText(capture.address);
  const sourceDescription = normalizeText(capture.sourceDescription);
  const notes = normalizeText(capture.notes);
  const normalizedPhotoUrls = normalizePhotoUrls(capture.imageUrl, capture.photoUrls);
  const imageUrl = normalizedPhotoUrls[0] ?? null;
  const title =
    cleanupImportedTitle(normalizeText(capture.title) ?? address, adapter) ??
    buildFallbackTitle(source, sourceExternalId);
  const rawPrice = parseImportedPrice(capture.price);
  const {
    price,
    source: nightlyPriceSource,
    startDate: priceQuotedStartDate,
    endDate: priceQuotedEndDate,
  } = deriveNightlyPrice(rawPrice, capture.priceMeta ?? null);
  const bedroomCount = parseNumberish(capture.bedroomCount);
  const bedCount = parseNumberish(capture.bedCount ?? deriveBedCountFromRoomBreakdown(capture.roomBreakdown));
  const bathroomCount = parseNumberish(capture.bathroomCount);
  const importStatus = determineImportStatus({
    title,
    address,
    price,
    photoUrls: normalizedPhotoUrls,
  });

  const roomBreakdown: RoomBreakdown | null =
    capture.roomBreakdown &&
    Array.isArray(capture.roomBreakdown.rooms) &&
    capture.roomBreakdown.rooms.length > 0
      ? {
          summary: capture.roomBreakdown.summary ?? null,
          rooms: capture.roomBreakdown.rooms.map((r) => ({
            name: r.name.trim(),
            beds: r.beds.trim(),
            imageUrl: normalizeText(r.imageUrl) ?? null,
          })),
        }
      : null;

  return {
    canonicalUrl,
    title,
    address,
    price,
    nightlyPriceSource,
    priceQuotedStartDate,
    priceQuotedEndDate,
    bedroomCount,
    bedCount,
    bathroomCount,
    sourceDescription,
    notes,
    imageUrl,
    photoUrls: normalizedPhotoUrls,
    roomBreakdown,
    source,
    importMethod,
    importStatus,
    sourceExternalId,
    rawImportPayload: capture.rawPayload ?? capture,
  };
}

export function getMissingImportedListingFields(listing: NormalizedImportedListing): string[] {
  const missingFields: string[] = [];

  if (!listing.title) {
    missingFields.push('title');
  }

  if (!listing.address) {
    missingFields.push('address');
  }

  if (listing.price === null) {
    missingFields.push('price');
  }

  if (listing.photoUrls.length === 0) {
    missingFields.push('photos');
  }

  if (listing.bedroomCount === null) {
    missingFields.push('bedrooms');
  }

  if (listing.bedCount === null) {
    missingFields.push('beds');
  }

  if (listing.bathroomCount === null) {
    missingFields.push('bathrooms');
  }

  return missingFields;
}

export function extractImportDebugData(rawImportPayload: unknown): ListingImportDebugInfo | null {
  if (!rawImportPayload || typeof rawImportPayload !== 'object' || Array.isArray(rawImportPayload)) {
    return null;
  }

  const parserDebug = (rawImportPayload as Record<string, unknown>).parserDebug;

  if (!parserDebug || typeof parserDebug !== 'object' || Array.isArray(parserDebug)) {
    return null;
  }

  return parserDebug as ListingImportDebugInfo;
}
