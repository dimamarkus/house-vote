import { createHotelAdapterTemplate } from './createHotelAdapterTemplate';

/**
 * Booking.com adapter template. Not yet registered — see
 * `createHotelAdapterTemplate.ts` for the promotion checklist.
 *
 * Notes from a quick look at production pages (no saved sample yet):
 *   - Property name lives in `<h2 data-testid="title">` on most pages
 *   - Nightly price shows as `"US$189"` with a `<span data-testid="price-and-discounted-price">`
 *   - Property id is in the URL path: `/hotel/us/<slug>.html`
 */
export const bookingAdapter = createHotelAdapterTemplate({
  brand: 'booking',
  hosts: ['booking.com', 'www.booking.com'],
  matchesHostSuffix: true,
  selectors: {
    title: ['h2[data-testid="title"]', 'h1', 'main h1'],
    address: ['[data-testid="address"]', '[data-node_tt_id="location_score_tooltip"]'],
    price: [
      '[data-testid="price-and-discounted-price"]',
      '[data-testid="price-for-x-nights"]',
    ],
  },
  titleSuffix: /\s*[,|–\-]\s*Booking\.com\s*$/i,
  extractExternalId(canonicalUrl) {
    const match = canonicalUrl.pathname.match(/\/hotel\/[^/]+\/([^/]+?)(?:\.[a-z-]+)?$/i);
    return match?.[1] ?? null;
  },
});
