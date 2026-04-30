import type { TripPriceContext } from '@/features/listings/utils/priceBasis';

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

export function normalizeTripGuestBreakdown(
  input: TripGuestBreakdownInput,
): TripGuestBreakdown & { numberOfPeople: number | null } {
  const adultCount = normalizeNonNegativeInteger(input.adultCount);
  const childCount = normalizeNonNegativeInteger(input.childCount);
  const legacyGuestCount = normalizePositiveInteger(input.numberOfPeople);
  const hasStructuredCounts = adultCount !== null || childCount !== null;

  if (hasStructuredCounts) {
    const normalizedAdultCount = adultCount ?? 0;
    const normalizedChildCount = childCount ?? 0;
    const numberOfPeople = normalizedAdultCount + normalizedChildCount;

    return {
      adultCount: normalizedAdultCount,
      childCount: normalizedChildCount,
      numberOfPeople: numberOfPeople > 0 ? numberOfPeople : null,
    };
  }

  if (legacyGuestCount) {
    return {
      adultCount: legacyGuestCount,
      childCount: 0,
      numberOfPeople: legacyGuestCount,
    };
  }

  return {
    adultCount: null,
    childCount: null,
    numberOfPeople: null,
  };
}

export function createTripTravelContext(input: TripTravelContextInput): TripTravelContext {
  const guestBreakdown = normalizeTripGuestBreakdown(input);

  return {
    ...guestBreakdown,
    startDate: normalizeDateValue(input.startDate),
    endDate: normalizeDateValue(input.endDate),
  };
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatTripGuestBreakdownLabel(
  input: TripGuestBreakdownInput,
): string | null {
  const { adultCount, childCount, numberOfPeople } = normalizeTripGuestBreakdown(input);

  if (!numberOfPeople) {
    return null;
  }

  if (childCount && childCount > 0) {
    const parts = [];
    if (adultCount && adultCount > 0) {
      parts.push(pluralize(adultCount, 'adult', 'adults'));
    }
    parts.push(pluralize(childCount, 'child', 'children'));
    return parts.join(', ');
  }

  return pluralize(numberOfPeople, 'guest', 'guests');
}
