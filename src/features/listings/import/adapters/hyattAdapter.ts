import { createHotelAdapterTemplate } from './createHotelAdapterTemplate';

/**
 * Hyatt adapter template. Not yet registered — see
 * `createHotelAdapterTemplate.ts` for the promotion checklist.
 *
 * Hyatt's main booking surface lives at hyatt.com; Andaz, Park Hyatt,
 * Grand Hyatt, etc. all funnel through hyatt.com for reservations.
 */
export const hyattAdapter = createHotelAdapterTemplate({
  brand: 'hyatt',
  hosts: ['hyatt.com', 'www.hyatt.com'],
  matchesHostSuffix: true,
  selectors: {
    title: ['h1[data-testid="hotel-title"]', 'h1.b-hotel-title', 'main h1'],
    address: ['[data-testid="hotel-address"]', '.b-hotel-address'],
    price: [
      '[data-testid="rate-amount"]',
      '[data-testid="room-price"]',
      '.b-rate-price',
    ],
  },
  titleSuffix: /\s*\|\s*Hyatt\s*$/i,
  extractExternalId(canonicalUrl) {
    const match = canonicalUrl.pathname.match(/\/hotels\/[^/]+\/([^/]+)/i);
    return match?.[1] ?? null;
  },
});
