/**
 * Price-basis (total / per-guest) display math.
 *
 * Storage is in whole dollars for the full stay total. This module only
 * handles presentation: given a stored total plus trip guest count, produce
 * the number to display for a given basis.
 */

export const PRICE_BASIS_VALUES = ['TOTAL', 'PER_GUEST'] as const;
export type PriceBasis = (typeof PRICE_BASIS_VALUES)[number];

export const DEFAULT_PRICE_BASIS: PriceBasis = 'TOTAL';

export const PRICE_BASIS_LABELS: Record<PriceBasis, string> = {
  TOTAL: 'Total',
  PER_GUEST: 'Per guest',
};

/**
 * Short unit label shown next to the price amount on cards/tables.
 * Intentionally short so it doesn't dominate the dollar figure.
 */
export const PRICE_BASIS_UNIT_LABELS: Record<PriceBasis, string> = {
  TOTAL: 'total',
  PER_GUEST: '/ guest',
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
  adultCount?: number | null;
  childCount?: number | null;
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
 * Which basis options are renderable given the trip context. TOTAL is always
 * available (we store stay totals). PER_GUEST needs a positive guest count.
 */
export function availablePriceBases(
  ctx: TripPriceContext | null | undefined,
): ReadonlyArray<PriceBasis> {
  const guests = ctx?.numberOfPeople ?? null;

  const available: PriceBasis[] = ['TOTAL'];
  if (guests && guests > 0) available.push('PER_GUEST');
  return available;
}

/**
 * Cycle to the next available price basis. Falls back to the first available
 * option (usually TOTAL) when the current basis isn't renderable.
 */
export function nextPriceBasis(
  current: PriceBasis,
  available: ReadonlyArray<PriceBasis>,
): PriceBasis {
  if (available.length === 0) {
    return DEFAULT_PRICE_BASIS;
  }

  const currentIndex = available.indexOf(current);
  if (currentIndex === -1) {
    return available[0] ?? DEFAULT_PRICE_BASIS;
  }

  return available[(currentIndex + 1) % available.length] ?? DEFAULT_PRICE_BASIS;
}

export interface ComputedListingPrice {
  /** Formatted amount (whole dollars, comma-grouped), or null if no price. */
  amount: string | null;
  /** Raw number used to derive `amount`, or null if no price. */
  rawAmount: number | null;
  /** Short label shown next to the amount (e.g. "total"). */
  unitLabel: string;
  /** True when the caller asked for a basis that couldn't be computed; we fell back to TOTAL. */
  fallback: boolean;
}

/**
 * Compute the display string for a listing's price under a given basis.
 * Rounds to whole dollars (storage is already Int dollars).
 */
export function computeListingPriceDisplay(
  totalPrice: number | null,
  basis: PriceBasis,
  ctx: TripPriceContext | null | undefined,
): ComputedListingPrice {
  if (totalPrice === null) {
    return {
      amount: null,
      rawAmount: null,
      unitLabel: PRICE_BASIS_UNIT_LABELS[basis],
      fallback: false,
    };
  }

  const guests = ctx?.numberOfPeople ?? null;

  let raw = totalPrice;
  let effectiveBasis: PriceBasis = 'TOTAL';
  let fallback = false;

  if (basis === 'PER_GUEST') {
    if (guests && guests > 0) {
      raw = Math.round(totalPrice / guests);
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
