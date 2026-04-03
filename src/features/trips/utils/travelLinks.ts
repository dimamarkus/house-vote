/**
 * Generates travel site URLs with parameters from trip data
 */

/**
 * Format a date to YYYY-MM-DD format for URL parameters
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  try {
    const isoString = date.toISOString();
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
  startDate?: Date | null;
  endDate?: Date | null;
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
  const queryParams = [];

  // Add dates if available
  const checkinDate = formatDate(startDate);
  if (checkinDate) {
    queryParams.push(`checkin=${checkinDate}`);
  }

  const checkoutDate = formatDate(endDate);
  if (checkoutDate) {
    queryParams.push(`checkout=${checkoutDate}`);
  }

  // Add guests if available
  if (typeof numberOfPeople === 'number' && numberOfPeople > 0) {
    queryParams.push(`adults=${numberOfPeople}`);
  }

  // Add query string if we have parameters
  if (queryParams.length > 0) {
    return `${baseUrl}?${queryParams.join('&')}`;
  }

  return baseUrl;
}

/**
 * Generate a Vrbo search URL with trip parameters
 */
export function generateVrboUrl(params: {
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
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