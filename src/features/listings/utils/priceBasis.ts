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
} from '../../trips/utils/partyUnitLabels';

// Order matters: this is the click-through cycle (Total -> Per night -> Per unit).
export const PRICE_BASIS_VALUES = ['TOTAL', 'NIGHTLY', 'PER_GUEST'] as const;
export type PriceBasis = (typeof PRICE_BASIS_VALUES)[number];

export const DEFAULT_PRICE_BASIS: PriceBasis = 'TOTAL';

/** Default labels (guest mode). Prefer `priceBasisLabel` when partyUnit is known. */
export const PRICE_BASIS_LABELS: Record<PriceBasis, string> = {
  TOTAL: 'Total',
  NIGHTLY: 'Per night',
  PER_GUEST: 'Per guest',
};

export function priceBasisLabel(
  basis: PriceBasis,
  partyUnit: PartyUnit | null | undefined,
): string {
  switch (basis) {
    case 'TOTAL':
      return 'Total';
    case 'NIGHTLY':
      return 'Per night';
    case 'PER_GUEST':
      return getPartyUnitLabels(partyUnit).perUnit;
    default: {
      const _exhaustive: never = basis;
      return _exhaustive;
    }
  }
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
 * Which basis options are renderable given the trip context, in cycle order.
 * NIGHTLY is always available (we store the nightly rate). TOTAL needs trip
 * dates (otherwise it's identical to NIGHTLY). PER_GUEST needs a positive
 * divisor (joined guests or party size).
 */
export function availablePriceBases(
  ctx: TripPriceContext | null | undefined,
): ReadonlyArray<PriceBasis> {
  const hasDates = computeNightsFromDates(ctx?.startDate, ctx?.endDate) !== null;
  const hasDivisor = perGuestDivisor(ctx) !== null;

  return PRICE_BASIS_VALUES.filter((basis) => {
    switch (basis) {
      case 'NIGHTLY':
        return true;
      case 'TOTAL':
        return hasDates;
      case 'PER_GUEST':
        return hasDivisor;
      default: {
        const _exhaustive: never = basis;
        return _exhaustive;
      }
    }
  });
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

/** Short unit label for a resolved (effective) basis. */
function unitLabelFor(
  basis: PriceBasis,
  hasDates: boolean,
  perUnitShort: string,
): string {
  switch (basis) {
    case 'NIGHTLY':
      return '/ night';
    case 'TOTAL':
      return 'total';
    case 'PER_GUEST':
      return hasDates ? perUnitShort : `${perUnitShort} / night`;
    default: {
      const _exhaustive: never = basis;
      return _exhaustive;
    }
  }
}

/**
 * Compute the display string for a listing's price under a given basis.
 *
 * `nightlyPrice` is the stored per-night rate. TOTAL multiplies it by the trip
 * night count; NIGHTLY shows it as-is; PER_GUEST divides the stay amount by the
 * guest/family divisor. When a basis can't be computed (TOTAL/PER_GUEST without
 * the needed dates or divisor) we fall back to the nearest sensible basis and
 * flag it.
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
      unitLabel: unitLabelFor(basis, true, perUnitShort),
      fallback: false,
    };
  }

  const nights = computeNightsFromDates(ctx?.startDate, ctx?.endDate);
  const hasDates = nights !== null;
  const stayAmount = hasDates ? nightlyPrice * nights : nightlyPrice;
  const divisor = perGuestDivisor(ctx);

  let raw: number;
  let effectiveBasis: PriceBasis = basis;
  let fallback = false;

  switch (basis) {
    case 'NIGHTLY':
      raw = nightlyPrice;
      break;
    case 'TOTAL':
      if (hasDates) {
        raw = stayAmount;
      } else {
        // No dates: total == nightly, so present it honestly as nightly.
        raw = nightlyPrice;
        effectiveBasis = 'NIGHTLY';
        fallback = true;
      }
      break;
    case 'PER_GUEST':
      if (divisor !== null) {
        raw = Math.round(stayAmount / divisor);
      } else {
        raw = stayAmount;
        effectiveBasis = hasDates ? 'TOTAL' : 'NIGHTLY';
        fallback = true;
      }
      break;
    default: {
      const _exhaustive: never = basis;
      return _exhaustive;
    }
  }

  return {
    amount: Math.round(raw).toLocaleString(),
    rawAmount: Math.round(raw),
    unitLabel: unitLabelFor(effectiveBasis, hasDates, perUnitShort),
    fallback,
  };
}
