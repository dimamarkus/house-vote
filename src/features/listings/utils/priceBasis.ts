/**
 * Price-basis (total / per-guest-or-family) display math.
 *
 * Storage is the per-night rate in whole dollars — the date-independent unit
 * OTAs quote reliably. This module derives everything shown to the user at
 * render time from that nightly rate plus the trip's current dates and party
 * count, so changing the dates (or who has joined) never leaves a stale total
 * baked into the row.
 */

import {
  getPartyUnitLabels,
  normalizePartyUnit,
  type PartyUnit,
} from '@/features/trips/utils/partyUnitLabels';

export const PRICE_BASIS_VALUES = ['TOTAL', 'PER_GUEST'] as const;
export type PriceBasis = (typeof PRICE_BASIS_VALUES)[number];

export const DEFAULT_PRICE_BASIS: PriceBasis = 'TOTAL';

/** Default labels (guest mode). Prefer `priceBasisLabel` when partyUnit is known. */
export const PRICE_BASIS_LABELS: Record<PriceBasis, string> = {
  TOTAL: 'Total',
  PER_GUEST: 'Per guest',
};

export function priceBasisLabel(
  basis: PriceBasis,
  partyUnit: PartyUnit | null | undefined,
): string {
  if (basis === 'TOTAL') {
    return 'Total';
  }

  return getPartyUnitLabels(partyUnit).perUnit;
}

export function isPriceBasis(value: unknown): value is PriceBasis {
  return (
    typeof value === 'string' &&
    (PRICE_BASIS_VALUES as ReadonlyArray<string>).includes(value)
  );
}

export interface TripPriceContext {
  /** Party-unit size (guests or families) used as the per-unit price divisor. */
  numberOfPeople: number | null;
  /**
   * Preferred divisor for the per-unit basis. On the public voting page this
   * is the number of people/families who have joined; elsewhere it's omitted
   * and we fall back to `numberOfPeople`.
   */
  guestCount?: number | null;
  /** Drives "Per guest" vs "Per family" copy. Defaults to GUEST. */
  partyUnit?: PartyUnit | null;
  startDate: Date | null;
  endDate: Date | null;
  adultCount?: number | null;
  childCount?: number | null;
}

/** Divisor for the per-guest basis: joined guests when known, else party size. */
function perGuestDivisor(ctx: TripPriceContext | null | undefined): number | null {
  const guestCount = ctx?.guestCount ?? null;
  if (guestCount && guestCount > 0) return guestCount;

  const numberOfPeople = ctx?.numberOfPeople ?? null;
  return numberOfPeople && numberOfPeople > 0 ? numberOfPeople : null;
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
 * available. PER_GUEST needs a positive guest divisor (joined guests or party
 * size).
 */
export function availablePriceBases(
  ctx: TripPriceContext | null | undefined,
): ReadonlyArray<PriceBasis> {
  const available: PriceBasis[] = ['TOTAL'];
  if (perGuestDivisor(ctx) !== null) available.push('PER_GUEST');
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
 *
 * `nightlyPrice` is the stored per-night rate. When the trip has dates we
 * multiply by the night count to get the stay total; without dates we can only
 * show the nightly figure, so the unit label switches to "/ night" to stay
 * honest. Per-guest divides the shown amount by the guest divisor.
 */
export function computeListingPriceDisplay(
  nightlyPrice: number | null,
  basis: PriceBasis,
  ctx: TripPriceContext | null | undefined,
): ComputedListingPrice {
  const perUnitShort = getPartyUnitLabels(normalizePartyUnit(ctx?.partyUnit)).perUnitShort;

  if (nightlyPrice === null) {
    return {
      amount: null,
      rawAmount: null,
      unitLabel: basis === 'PER_GUEST' ? perUnitShort : 'total',
      fallback: false,
    };
  }

  const nights = computeNightsFromDates(ctx?.startDate, ctx?.endDate);
  const hasDates = nights !== null;
  const stayAmount = hasDates ? nightlyPrice * nights : nightlyPrice;
  const divisor = perGuestDivisor(ctx);

  let raw = stayAmount;
  let effectiveBasis: PriceBasis = 'TOTAL';
  let fallback = false;

  if (basis === 'PER_GUEST') {
    if (divisor !== null) {
      raw = Math.round(stayAmount / divisor);
      effectiveBasis = 'PER_GUEST';
    } else {
      fallback = true;
    }
  }

  const unitLabel = effectiveBasis === 'PER_GUEST'
    ? (hasDates ? perUnitShort : `${perUnitShort} / night`)
    : (hasDates ? 'total' : '/ night');

  return {
    amount: Math.round(raw).toLocaleString(),
    rawAmount: Math.round(raw),
    unitLabel,
    fallback,
  };
}
