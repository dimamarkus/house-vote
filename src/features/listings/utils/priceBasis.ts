/**
 * Price-basis (per-night / per-guest / total) display math.
 *
 * All storage is in whole dollars on a per-night basis (see PR 6). This
 * module only handles presentation: given a nightly price plus trip context
 * (nights + guests), produce the number to display for a given basis.
 */

export const PRICE_BASIS_VALUES = ['NIGHTLY', 'PER_GUEST', 'TOTAL'] as const;
export type PriceBasis = (typeof PRICE_BASIS_VALUES)[number];

export const DEFAULT_PRICE_BASIS: PriceBasis = 'NIGHTLY';

export const PRICE_BASIS_LABELS: Record<PriceBasis, string> = {
  NIGHTLY: 'Per night',
  PER_GUEST: 'Per guest',
  TOTAL: 'Total',
};

/**
 * Short unit label shown next to the price amount on cards/tables.
 * Intentionally short so it doesn't dominate the dollar figure.
 */
export const PRICE_BASIS_UNIT_LABELS: Record<PriceBasis, string> = {
  NIGHTLY: '/ night',
  PER_GUEST: '/ guest',
  TOTAL: 'total',
};

export function isPriceBasis(value: unknown): value is PriceBasis {
  return (
    typeof value === 'string' &&
    (PRICE_BASIS_VALUES as ReadonlyArray<string>).includes(value)
  );
}

export interface TripPriceContext {
  numberOfPeople: number | null;
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Night count between two dates (end-exclusive, standard lodging convention).
 * Returns null when dates are missing or the range is non-positive.
 */
export function computeNightsFromDates(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
): number | null {
  if (!startDate || !endDate) return null;
  const ms = endDate.getTime() - startDate.getTime();
  if (!Number.isFinite(ms)) return null;
  const nights = Math.round(ms / 86_400_000);
  return nights > 0 ? nights : null;
}

/**
 * Which basis options are renderable given the trip context. NIGHTLY is
 * always available (we store nightly prices). TOTAL needs nights. PER_GUEST
 * needs both nights (to compute total) and a positive guest count.
 */
export function availablePriceBases(
  ctx: TripPriceContext | null | undefined,
): ReadonlyArray<PriceBasis> {
  const nights = computeNightsFromDates(ctx?.startDate, ctx?.endDate);
  const guests = ctx?.numberOfPeople ?? null;

  const available: PriceBasis[] = ['NIGHTLY'];
  if (nights && nights > 0) available.push('TOTAL');
  if (nights && nights > 0 && guests && guests > 0) available.push('PER_GUEST');
  return available;
}

export interface ComputedListingPrice {
  /** Formatted amount (whole dollars, comma-grouped), or null if no price. */
  amount: string | null;
  /** Raw number used to derive `amount`, or null if no price. */
  rawAmount: number | null;
  /** Short label shown next to the amount (e.g. "/ night"). */
  unitLabel: string;
  /** True when the caller asked for a basis that couldn't be computed; we fell back to NIGHTLY. */
  fallback: boolean;
}

/**
 * Compute the display string for a listing's price under a given basis.
 * Rounds to whole dollars (storage is already Int dollars).
 */
export function computeListingPriceDisplay(
  nightlyPrice: number | null,
  basis: PriceBasis,
  ctx: TripPriceContext | null | undefined,
): ComputedListingPrice {
  if (nightlyPrice === null) {
    return {
      amount: null,
      rawAmount: null,
      unitLabel: PRICE_BASIS_UNIT_LABELS[basis],
      fallback: false,
    };
  }

  const nights = computeNightsFromDates(ctx?.startDate, ctx?.endDate);
  const guests = ctx?.numberOfPeople ?? null;

  let raw = nightlyPrice;
  let effectiveBasis: PriceBasis = 'NIGHTLY';
  let fallback = false;

  if (basis === 'TOTAL') {
    if (nights && nights > 0) {
      raw = nightlyPrice * nights;
      effectiveBasis = 'TOTAL';
    } else {
      fallback = true;
    }
  } else if (basis === 'PER_GUEST') {
    if (nights && nights > 0 && guests && guests > 0) {
      raw = Math.round((nightlyPrice * nights) / guests);
      effectiveBasis = 'PER_GUEST';
    } else {
      fallback = true;
    }
  }

  return {
    amount: Math.round(raw).toLocaleString(),
    rawAmount: Math.round(raw),
    unitLabel: PRICE_BASIS_UNIT_LABELS[effectiveBasis],
    fallback,
  };
}
