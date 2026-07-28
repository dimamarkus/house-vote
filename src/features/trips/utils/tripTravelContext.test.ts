import { describe, expect, it } from 'vitest';
import {
  createTripTravelContext,
  formatTripGuestBreakdownLabel,
  getOtaGuestTotal,
  normalizeTripGuestBreakdown,
} from './tripTravelContext';

describe('normalizeTripGuestBreakdown', () => {
  it('keeps party-unit count independent from adults/children', () => {
    expect(
      normalizeTripGuestBreakdown({
        numberOfPeople: 5,
        adultCount: 8,
        childCount: 4,
        partyUnit: 'FAMILY',
      }),
    ).toEqual({
      adultCount: 8,
      childCount: 4,
      numberOfPeople: 5,
      partyUnit: 'FAMILY',
    });
  });

  it('does not invent a party-unit count from adults/children', () => {
    expect(normalizeTripGuestBreakdown({ adultCount: 8, childCount: 4 })).toEqual({
      adultCount: 8,
      childCount: 4,
      numberOfPeople: null,
      partyUnit: 'GUEST',
    });
  });
});

describe('getOtaGuestTotal', () => {
  it('sums adults and children for OTA headcount', () => {
    expect(getOtaGuestTotal({ adultCount: 8, childCount: 4, numberOfPeople: 5 })).toBe(12);
  });

  it('ignores party-unit count when adults/children are missing', () => {
    expect(getOtaGuestTotal({ numberOfPeople: 5 })).toBeNull();
  });
});

describe('createTripTravelContext', () => {
  it('normalizes dates and counts together', () => {
    const context = createTripTravelContext({
      numberOfPeople: 5,
      partyUnit: 'FAMILY',
      adultCount: 2,
      childCount: 1,
      startDate: '2026-08-17',
      endDate: '2026-08-21',
    });

    expect(context.numberOfPeople).toBe(5);
    expect(context.partyUnit).toBe('FAMILY');
    expect(context.adultCount).toBe(2);
    expect(context.childCount).toBe(1);
    expect(context.startDate?.toISOString()).toContain('2026-08-17');
    expect(context.endDate?.toISOString()).toContain('2026-08-21');
  });
});

describe('formatTripGuestBreakdownLabel', () => {
  it('labels the party-unit count as guests by default', () => {
    expect(formatTripGuestBreakdownLabel({ numberOfPeople: 12 })).toBe('12 guests');
  });

  it('labels the party-unit count as families when configured', () => {
    expect(
      formatTripGuestBreakdownLabel({ numberOfPeople: 5, partyUnit: 'FAMILY' }),
    ).toBe('5 families');
  });
});
