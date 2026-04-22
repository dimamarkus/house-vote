import { createHotelAdapterTemplate } from './createHotelAdapterTemplate';

/**
 * Expedia adapter template. Not yet registered — see
 * `createHotelAdapterTemplate.ts` for the promotion checklist.
 *
 * Expedia shares much of its front-end with Hotels.com and Vrbo (all
 * Expedia Group properties), so we may be able to factor out shared
 * selectors once we see real samples from each.
 */
export const expediaAdapter = createHotelAdapterTemplate({
  brand: 'expedia',
  hosts: ['expedia.com', 'www.expedia.com', 'expedia.co.uk', 'expedia.ca'],
  matchesHostSuffix: true,
  selectors: {
    title: ['h1[data-stid="content-hotel-title"]', 'h1', 'main h1'],
    address: ['[data-stid="content-hotel-location"]', '[data-stid="property-location"]'],
    price: [
      '[data-test-id="price-summary-message"]',
      '[data-stid="price-summary"]',
      '[data-test-id="displayed-price"]',
    ],
  },
  titleSuffix: /\s*\|\s*Expedia(?:\.[a-z]+)?\s*$/i,
  extractExternalId(canonicalUrl) {
    const match = canonicalUrl.pathname.match(/\/h(\d+)\.Hotel-Information/i);
    return match?.[1] ?? null;
  },
});
