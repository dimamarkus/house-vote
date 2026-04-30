import { describe, expect, it } from 'vitest';
import {
  createTripTravelContext,
  formatTripGuestBreakdownLabel,
  normalizeTripGuestBreakdown,
} from './tripTravelContext';

describe('normalizeTripGuestBreakdown', () => {
  it('treats legacy total guest counts as adults', () => {
    expect(normalizeTripGuestBreakdown({ numberOfPeople: 12 })).toEqual({
      adultCount: 12,
      childCount: 0,
      numberOfPeople: 12,
    });
  });

  it('derives the total from adult and child counts', () => {
    expect(normalizeTripGuestBreakdown({ adultCount: 8, childCount: 4 })).toEqual({
      adultCount: 8,
      childCount: 4,
      numberOfPeople: 12,
    });
  });
});

describe('createTripTravelContext', () => {
  it('normalizes dates and guest counts together', () => {
    const context = createTripTravelContext({
      adultCount: 2,
      childCount: 1,
      startDate: '2026-08-17',
      endDate: '2026-08-21',
    });

    expect(context.numberOfPeople).toBe(3);
    expect(context.adultCount).toBe(2);
    expect(context.childCount).toBe(1);
    expect(context.startDate?.toISOString()).toContain('2026-08-17');
    expect(context.endDate?.toISOString()).toContain('2026-08-21');
  });
});

describe('formatTripGuestBreakdownLabel', () => {
  it('uses a simple guest label when there are no children', () => {
    expect(formatTripGuestBreakdownLabel({ adultCount: 12, childCount: 0 })).toBe('12 guests');
  });

  it('shows adults and children when children are present', () => {
    expect(formatTripGuestBreakdownLabel({ adultCount: 8, childCount: 4 })).toBe('8 adults, 4 children');
  });
});
