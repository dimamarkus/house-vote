import { createHotelAdapterTemplate } from './createHotelAdapterTemplate';

/**
 * Marriott adapter template. Not yet registered — see
 * `createHotelAdapterTemplate.ts` for the promotion checklist.
 *
 * Marriott umbrella brands share infrastructure under marriott.com. Sub-brands
 * like Ritz-Carlton, St. Regis, W, Westin, Sheraton, etc. have their own
 * marketing domains but all route reservations through marriott.com.
 */
export const marriottAdapter = createHotelAdapterTemplate({
  brand: 'marriott',
  hosts: [
    'marriott.com',
    'www.marriott.com',
    'ritzcarlton.com',
    'stregis.com',
    'westin.com',
    'sheraton.com',
  ],
  matchesHostSuffix: true,
  selectors: {
    title: ['h1[data-testid="hotel-title"]', 'h1.hotel-title', 'main h1'],
    address: ['[data-testid="hotel-address"]', '.hotel-address', 'address'],
    price: [
      '[data-testid="room-rate"]',
      '[data-testid="best-available-rate"]',
      '.price-info',
    ],
  },
  titleSuffix: /\s*\|\s*Marriott(?:\s+Hotels?)?\s*$/i,
  extractExternalId(canonicalUrl) {
    const match = canonicalUrl.pathname.match(/\/hotels\/travel\/([^/]+)\//i);
    return match?.[1] ?? null;
  },
});
