import type { TripPriceContext } from '@/features/listings/utils/priceBasis';
import {
  formatPartyUnitCount,
  normalizePartyUnit,
  type PartyUnit,
} from './partyUnitLabels';

type DateValue = Date | string | null | undefined;

export interface TripGuestBreakdown {
  adultCount: number | null;
  childCount: number | null;
}

export interface TripTravelContext extends TripPriceContext {
  adultCount: number | null;
  childCount: number | null;
}

interface TripGuestBreakdownInput {
  adultCount?: number | null;
  childCount?: number | null;
  numberOfPeople?: number | null;
  partyUnit?: PartyUnit | null;
}

interface TripTravelContextInput extends TripGuestBreakdownInput {
  startDate?: DateValue;
  endDate?: DateValue;
}

function normalizeNonNegativeInteger(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const integer = Math.trunc(value);
  return integer >= 0 ? integer : null;
}

function normalizePositiveInteger(value: number | null | undefined): number | null {
  const integer = normalizeNonNegativeInteger(value);
  return integer && integer > 0 ? integer : null;
}

function normalizeDateValue(value: DateValue): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Normalize the two independent trip counts:
 * - `numberOfPeople` = party-unit size (guests or families) for price dividers
 * - `adultCount` / `childCount` = OTA search-link headcount only
 *
 * These are intentionally not derived from each other.
 */
export function normalizeTripGuestBreakdown(
  input: TripGuestBreakdownInput,
): TripGuestBreakdown & { numberOfPeople: number | null; partyUnit: PartyUnit } {
  const adultCount = normalizeNonNegativeInteger(input.adultCount);
  const childCount = normalizeNonNegativeInteger(input.childCount);
  const numberOfPeople = normalizePositiveInteger(input.numberOfPeople);

  return {
    adultCount,
    childCount,
    numberOfPeople,
    partyUnit: normalizePartyUnit(input.partyUnit),
  };
}

/** Headcount sent to Airbnb / Vrbo. Uses adults+children only — never the party-unit count. */
export function getOtaGuestTotal(input: TripGuestBreakdownInput): number | null {
  const { adultCount, childCount } = normalizeTripGuestBreakdown(input);
  if (adultCount === null && childCount === null) {
    return null;
  }

  const total = (adultCount ?? 0) + (childCount ?? 0);
  return total > 0 ? total : null;
}

export function createTripTravelContext(input: TripTravelContextInput): TripTravelContext {
  const guestBreakdown = normalizeTripGuestBreakdown(input);

  return {
    ...guestBreakdown,
    startDate: normalizeDateValue(input.startDate),
    endDate: normalizeDateValue(input.endDate),
  };
}

/**
 * Party-size badge label, e.g. "5 families" or "12 guests".
 * Adults/children are omitted — those are OTA-only.
 */
export function formatTripGuestBreakdownLabel(
  input: TripGuestBreakdownInput,
): string | null {
  const { numberOfPeople, partyUnit } = normalizeTripGuestBreakdown(input);

  if (!numberOfPeople) {
    return null;
  }

  return formatPartyUnitCount(numberOfPeople, partyUnit);
}
