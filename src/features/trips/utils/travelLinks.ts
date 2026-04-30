import type { ListingSource } from 'db';
import { normalizeTripGuestBreakdown } from './tripTravelContext';

/**
 * Generates travel site URLs with parameters from trip data.
 */

export type TravelDateValue = Date | string | null | undefined;

interface TravelGuestParams {
  adultCount?: number | null;
  childCount?: number | null;
  numberOfPeople?: number | null;
}

const DEFAULT_VRBO_CHILD_AGE = 9;

function parseTravelDate(date: TravelDateValue): Date | null {
  if (!date) {
    return null;
  }

  const parsedDate = date instanceof Date ? date : new Date(date);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

/**
 * Format a date to YYYY-MM-DD format for URL parameters.
 */
export function formatTravelDate(date: TravelDateValue): string {
  const parsedDate = parseTravelDate(date);

  if (!parsedDate) return '';

  try {
    const isoString = parsedDate.toISOString();
    // Use type assertion to ensure string
    return isoString.split('T')[0] || '';
  } catch {
    console.error('Invalid date:', date);
    return '';
  }
}

/**
 * Generate an Airbnb search URL with trip parameters
 */
export function generateAirbnbUrl(params: {
  location?: string | null;
  startDate?: TravelDateValue;
  endDate?: TravelDateValue;
} & TravelGuestParams): string {
  const { location, startDate, endDate } = params;
  const guestBreakdown = normalizeTripGuestBreakdown(params);

  // Base URL for Airbnb search
  let baseUrl = 'https://www.airbnb.com/s/homes';

  // Add location if available (replacing spaces with--)
  if (location && location.trim() !== '') {
    const formattedLocation = location.trim().replace(/ /g, '--');
    baseUrl = `https://www.airbnb.com/s/${formattedLocation}/homes`;
  }

  // Build query parameters
  const queryParams = new URLSearchParams();

  queryParams.set('refinement_paths[]', '/homes');

  // Add dates if available
  const checkinDate = formatTravelDate(startDate);
  if (checkinDate) {
    queryParams.set('checkin', checkinDate);
  }

  const checkoutDate = formatTravelDate(endDate);
  if (checkoutDate) {
    queryParams.set('checkout', checkoutDate);
  }

  if (checkinDate || checkoutDate) {
    queryParams.set('date_picker_type', 'calendar');
  }

  // Add guests if available
  if (guestBreakdown.numberOfPeople) {
    queryParams.set('guests', guestBreakdown.numberOfPeople.toString());

    if (guestBreakdown.adultCount !== null) {
      const adultCount = guestBreakdown.adultCount.toString();
      queryParams.set('adults', adultCount);
      queryParams.set('numberOfAdults', adultCount);
    }

    const childCount = (guestBreakdown.childCount ?? 0).toString();
    queryParams.set('numberOfChildren', childCount);
    queryParams.set('children', childCount);
  }

  // Add query string if we have parameters
  const queryString = queryParams.toString();
  if (queryString) {
    return `${baseUrl}?${queryString}`;
  }

  return baseUrl;
}

/**
 * Generate a Vrbo search URL with trip parameters
 */
export function generateVrboUrl(params: {
  location?: string | null;
  startDate?: TravelDateValue;
  endDate?: TravelDateValue;
} & TravelGuestParams): string {
  const { location, startDate, endDate } = params;
  const guestBreakdown = normalizeTripGuestBreakdown(params);

  // Base URL for Vrbo search
  let baseUrl = 'https://www.vrbo.com/search';

  // Add location if available
  if (location && location.trim() !== '') {
    const encodedLocation = encodeURIComponent(location.trim());
    baseUrl = `https://www.vrbo.com/search/keywords:${encodedLocation}`;
  }

  // Build query parameters
  const queryParams = [];

  // Add dates if available
  const arrivalDate = formatTravelDate(startDate);
  if (arrivalDate) {
    queryParams.push(`arrival=${arrivalDate}`);
  }

  const departureDate = formatTravelDate(endDate);
  if (departureDate) {
    queryParams.push(`departure=${departureDate}`);
  }

  // Add guests if available
  if (guestBreakdown.adultCount !== null) {
    queryParams.push(`adultsCount=${guestBreakdown.adultCount}`);
  }

  const childrenParam = buildVrboChildrenParam(guestBreakdown.childCount);
  if (childrenParam) {
    queryParams.push(`children=${encodeURIComponent(childrenParam)}`);
  }

  // Add query string if we have parameters
  if (queryParams.length > 0) {
    return `${baseUrl}?${queryParams.join('&')}`;
  }

  return baseUrl;
}

function inferListingSourceFromUrl(url: URL): 'AIRBNB' | 'VRBO' | null {
  const hostname = url.hostname.toLowerCase();

  if (hostname === 'airbnb.com' || hostname.endsWith('.airbnb.com')) {
    return 'AIRBNB';
  }

  if (hostname === 'vrbo.com' || hostname.endsWith('.vrbo.com')) {
    return 'VRBO';
  }

  return null;
}

function extractAirbnbProductId(url: URL): string | null {
  const existingProductId = url.searchParams.get('productId');
  if (existingProductId) {
    return existingProductId;
  }

  const productMatch = url.pathname.match(/\/(?:rooms|book\/stays)\/([^/?]+)/i);
  return productMatch?.[1] ?? null;
}

function buildVrboChildrenParam(childCount: number | null): string | null {
  if (!childCount || childCount <= 0) {
    return null;
  }

  return Array.from(
    { length: childCount },
    () => `1_${DEFAULT_VRBO_CHILD_AGE}`,
  ).join(',');
}

function addAirbnbListingParams(
  url: URL,
  startDate: TravelDateValue,
  endDate: TravelDateValue,
  guestParams: TravelGuestParams,
) {
  const checkinDate = formatTravelDate(startDate);
  const checkoutDate = formatTravelDate(endDate);
  const guestBreakdown = normalizeTripGuestBreakdown(guestParams);
  const productId = extractAirbnbProductId(url);
  const hasTripParams = Boolean(checkinDate || checkoutDate || guestBreakdown.numberOfPeople);

  if (checkinDate) {
    url.searchParams.set('checkin', checkinDate);
    url.searchParams.set('check_in', checkinDate);
  }

  if (checkoutDate) {
    url.searchParams.set('checkout', checkoutDate);
    url.searchParams.set('check_out', checkoutDate);
  }

  if (guestBreakdown.numberOfPeople) {
    url.searchParams.set('guests', guestBreakdown.numberOfPeople.toString());

    if (guestBreakdown.adultCount !== null) {
      const adultCount = guestBreakdown.adultCount.toString();
      url.searchParams.set('numberOfAdults', adultCount);
      url.searchParams.set('adults', adultCount);
    }
  }

  if (productId && hasTripParams) {
    url.searchParams.set('productId', productId);
  }

  if (hasTripParams) {
    const childCount = (guestBreakdown.childCount ?? 0).toString();
    url.searchParams.set('numberOfChildren', childCount);
    url.searchParams.set('children', childCount);
    url.searchParams.set('numberOfInfants', '0');
    url.searchParams.set('numberOfPets', '0');
    url.searchParams.set('isWorkTrip', 'false');
  }
}

function addVrboListingParams(
  url: URL,
  startDate: TravelDateValue,
  endDate: TravelDateValue,
  guestParams: TravelGuestParams,
) {
  const checkinDate = formatTravelDate(startDate);
  const checkoutDate = formatTravelDate(endDate);
  const guestBreakdown = normalizeTripGuestBreakdown(guestParams);

  if (checkinDate) {
    url.searchParams.set('chkin', checkinDate);
    url.searchParams.set('d1', checkinDate);
    url.searchParams.set('startDate', checkinDate);
  }

  if (checkoutDate) {
    url.searchParams.set('chkout', checkoutDate);
    url.searchParams.set('d2', checkoutDate);
    url.searchParams.set('endDate', checkoutDate);
  }

  if (guestBreakdown.adultCount !== null) {
    url.searchParams.set('adults', guestBreakdown.adultCount.toString());
  }

  const childrenParam = buildVrboChildrenParam(guestBreakdown.childCount);
  if (childrenParam) {
    url.searchParams.set('children', childrenParam);
  }
}

export function generateTravelListingUrl(params: {
  url?: string | null;
  source?: ListingSource | null;
  startDate?: TravelDateValue;
  endDate?: TravelDateValue;
} & TravelGuestParams): string | null {
  const originalUrl = params.url?.trim();

  if (!originalUrl) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(originalUrl);
  } catch {
    return originalUrl;
  }

  const source = params.source === 'AIRBNB' || params.source === 'VRBO'
    ? params.source
    : inferListingSourceFromUrl(parsedUrl);

  if (source === 'AIRBNB') {
    addAirbnbListingParams(
      parsedUrl,
      params.startDate,
      params.endDate,
      params,
    );
  }

  if (source === 'VRBO') {
    addVrboListingParams(
      parsedUrl,
      params.startDate,
      params.endDate,
      params,
    );
  }

  return parsedUrl.toString();
}