/**
 * Generates travel site URLs with parameters from trip data
 */

type TravelDateValue = Date | string | null | undefined;

function parseTravelDate(date: TravelDateValue): Date | null {
  if (!date) {
    return null;
  }

  const parsedDate = date instanceof Date ? date : new Date(date);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

/**
 * Format a date to YYYY-MM-DD format for URL parameters
 */
function formatDate(date: TravelDateValue): string {
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
  numberOfPeople?: number | null;
}): string {
  const { location, startDate, endDate, numberOfPeople } = params;

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
  const checkinDate = formatDate(startDate);
  if (checkinDate) {
    queryParams.set('checkin', checkinDate);
  }

  const checkoutDate = formatDate(endDate);
  if (checkoutDate) {
    queryParams.set('checkout', checkoutDate);
  }

  if (checkinDate || checkoutDate) {
    queryParams.set('date_picker_type', 'calendar');
  }

  // Add guests if available
  if (typeof numberOfPeople === 'number' && numberOfPeople > 0) {
    const guestCount = numberOfPeople.toString();
    queryParams.set('adults', guestCount);
    queryParams.set('guests', guestCount);
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
  numberOfPeople?: number | null;
}): string {
  const { location, startDate, endDate, numberOfPeople } = params;

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
  const arrivalDate = formatDate(startDate);
  if (arrivalDate) {
    queryParams.push(`arrival=${arrivalDate}`);
  }

  const departureDate = formatDate(endDate);
  if (departureDate) {
    queryParams.push(`departure=${departureDate}`);
  }

  // Add guests if available
  if (typeof numberOfPeople === 'number' && numberOfPeople > 0) {
    queryParams.push(`adultsCount=${numberOfPeople}`);
  }

  // Add query string if we have parameters
  if (queryParams.length > 0) {
    return `${baseUrl}?${queryParams.join('&')}`;
  }

  return baseUrl;
}