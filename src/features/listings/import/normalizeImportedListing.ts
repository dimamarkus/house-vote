import type {
  ListingImportCapture,
  ListingImportDebugInfo,
  ListingImportMethodValue,
  ListingImportSourceValue,
  ListingImportStatusValue,
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

function canonicalizeListingUrl(inputUrl: string, source: ListingImportSourceValue): string {
  const url = new URL(inputUrl);
  url.hash = '';

  if (source === 'AIRBNB' || source === 'VRBO') {
    url.search = '';
  } else {
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    for (const param of trackingParams) {
      url.searchParams.delete(param);
    }
  }

  url.pathname = url.pathname.replace(/\/+$/, '') || '/';

  return url.toString();
}

function extractSourceExternalId(canonicalUrl: string, source: ListingImportSourceValue): string | null {
  try {
    const url = new URL(canonicalUrl);

    if (source === 'AIRBNB') {
      const roomMatch = url.pathname.match(/\/rooms\/([^/]+)/i);
      return roomMatch?.[1] ?? null;
    }

    if (source === 'VRBO') {
      const pathSegment = url.pathname.split('/').filter(Boolean).at(-1) ?? null;
      if (!pathSegment) {
        return null;
      }

      const vrboMatch = pathSegment.match(/([0-9]+(?:ha)?)/i);
      return vrboMatch?.[1] ?? pathSegment;
    }

    return null;
  } catch {
    return null;
  }
}

function cleanupImportedTitle(
  value: string | null,
  source: ListingImportSourceValue,
): string | null {
  if (!value) {
    return null;
  }

  let normalizedValue = value;

  if (source === 'AIRBNB') {
    normalizedValue = normalizedValue.replace(/\s+-\s+Airbnb\s*$/i, '');
  }

  if (source === 'VRBO') {
    normalizedValue = normalizedValue.replace(/\s+\|\s+Vrbo\s*$/i, '');
  }

  normalizedValue = normalizedValue.trim();

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
  const source = capture.source ?? detectListingSource(capture.url);
  const canonicalUrl = canonicalizeListingUrl(capture.url, source);
  const sourceExternalId = extractSourceExternalId(canonicalUrl, source);
  const address = normalizeText(capture.address);
  const sourceDescription = normalizeText(capture.sourceDescription);
  const notes = normalizeText(capture.notes);
  const normalizedPhotoUrls = normalizePhotoUrls(capture.imageUrl, capture.photoUrls);
  const imageUrl = normalizedPhotoUrls[0] ?? null;
  const title =
    cleanupImportedTitle(normalizeText(capture.title) ?? address, source) ??
    buildFallbackTitle(source, sourceExternalId);
  const price = parseImportedPrice(capture.price);
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
