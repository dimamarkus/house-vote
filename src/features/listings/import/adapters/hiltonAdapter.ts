import { createHotelAdapterTemplate } from './createHotelAdapterTemplate';

/**
 * Hilton adapter template. Not yet registered — see
 * `createHotelAdapterTemplate.ts` for the promotion checklist.
 *
 * Hilton properties surface under a handful of hostnames (hilton.com plus
 * hhonors3.hilton.com for member-only flows). Sub-brands like Waldorf
 * Astoria, Conrad, Curio, etc. route through hilton.com for booking.
 */
export const hiltonAdapter = createHotelAdapterTemplate({
  brand: 'hilton',
  hosts: [
    'hilton.com',
    'www.hilton.com',
    'waldorfastoria3.hilton.com',
    'conradhotels3.hilton.com',
  ],
  matchesHostSuffix: true,
  selectors: {
    title: ['h1[data-testid="hotel-name"]', 'h1.hotel-name', 'main h1'],
    address: ['[data-testid="hotel-address"]', '.hotel-address', 'address'],
    price: [
      '[data-testid="room-rate-amount"]',
      '[data-testid="room-price"]',
      '.rate-price',
    ],
  },
  titleSuffix: /\s*\|\s*Hilton\s*$/i,
  extractExternalId(canonicalUrl) {
    const match = canonicalUrl.pathname.match(/\/hotels\/([^/]+)\/?/i);
    return match?.[1] ?? null;
  },
});
