import { describe, expect, it } from 'vitest';
import { generateAirbnbUrl, generateTravelListingUrl, generateVrboUrl } from './travelLinks';

describe('travel search URLs', () => {
  it('uses adult and child counts for Airbnb search URLs', () => {
    const url = generateAirbnbUrl({
      location: 'Poconos, PA',
      startDate: '2026-08-17',
      endDate: '2026-08-21',
      adultCount: 8,
      childCount: 4,
    });

    const parsedUrl = new URL(url);

    expect(parsedUrl.searchParams.get('checkin')).toBe('2026-08-17');
    expect(parsedUrl.searchParams.get('checkout')).toBe('2026-08-21');
    expect(parsedUrl.searchParams.get('adults')).toBe('8');
    expect(parsedUrl.searchParams.get('numberOfAdults')).toBe('8');
    expect(parsedUrl.searchParams.get('guests')).toBe('12');
    expect(parsedUrl.searchParams.get('numberOfChildren')).toBe('4');
  });

  it('uses adult count for Vrbo search URLs without fake child ages', () => {
    const url = generateVrboUrl({
      location: 'Poconos, PA',
      startDate: '2026-08-17',
      endDate: '2026-08-21',
      adultCount: 8,
      childCount: 4,
    });

    const parsedUrl = new URL(url);

    expect(parsedUrl.searchParams.get('arrival')).toBe('2026-08-17');
    expect(parsedUrl.searchParams.get('departure')).toBe('2026-08-21');
    expect(parsedUrl.searchParams.get('adultsCount')).toBe('8');
    expect(parsedUrl.searchParams.has('children')).toBe(false);
  });
});

describe('generateTravelListingUrl', () => {
  it('adds trip dates and guest count to Airbnb listing URLs', () => {
    const url = generateTravelListingUrl({
      url: 'https://www.airbnb.com/rooms/46898739',
      source: 'AIRBNB',
      startDate: '2026-05-19',
      endDate: '2026-05-21',
      numberOfPeople: 5,
    });

    const parsedUrl = new URL(url ?? '');

    expect(parsedUrl.pathname).toBe('/rooms/46898739');
    expect(parsedUrl.searchParams.get('checkin')).toBe('2026-05-19');
    expect(parsedUrl.searchParams.get('check_in')).toBe('2026-05-19');
    expect(parsedUrl.searchParams.get('checkout')).toBe('2026-05-21');
    expect(parsedUrl.searchParams.get('check_out')).toBe('2026-05-21');
    expect(parsedUrl.searchParams.get('numberOfAdults')).toBe('5');
    expect(parsedUrl.searchParams.get('adults')).toBe('5');
    expect(parsedUrl.searchParams.get('guests')).toBe('5');
    expect(parsedUrl.searchParams.get('numberOfChildren')).toBe('0');
    expect(parsedUrl.searchParams.get('numberOfInfants')).toBe('0');
    expect(parsedUrl.searchParams.get('numberOfPets')).toBe('0');
    expect(parsedUrl.searchParams.get('productId')).toBe('46898739');
  });

  it('uses adult and child counts for Airbnb listing URLs', () => {
    const url = generateTravelListingUrl({
      url: 'https://www.airbnb.com/rooms/46898739',
      source: 'AIRBNB',
      startDate: '2026-05-19',
      endDate: '2026-05-21',
      adultCount: 3,
      childCount: 2,
    });

    const parsedUrl = new URL(url ?? '');

    expect(parsedUrl.searchParams.get('numberOfAdults')).toBe('3');
    expect(parsedUrl.searchParams.get('adults')).toBe('3');
    expect(parsedUrl.searchParams.get('guests')).toBe('5');
    expect(parsedUrl.searchParams.get('numberOfChildren')).toBe('2');
  });

  it('adds trip dates and guest count to Vrbo listing URLs', () => {
    const url = generateTravelListingUrl({
      url: 'https://www.vrbo.com/2677958?selected=75860009',
      source: 'VRBO',
      startDate: '2026-05-12',
      endDate: '2026-05-23',
      numberOfPeople: 10,
    });

    const parsedUrl = new URL(url ?? '');

    expect(parsedUrl.pathname).toBe('/2677958');
    expect(parsedUrl.searchParams.get('selected')).toBe('75860009');
    expect(parsedUrl.searchParams.get('chkin')).toBe('2026-05-12');
    expect(parsedUrl.searchParams.get('chkout')).toBe('2026-05-23');
    expect(parsedUrl.searchParams.get('d1')).toBe('2026-05-12');
    expect(parsedUrl.searchParams.get('d2')).toBe('2026-05-23');
    expect(parsedUrl.searchParams.get('startDate')).toBe('2026-05-12');
    expect(parsedUrl.searchParams.get('endDate')).toBe('2026-05-23');
    expect(parsedUrl.searchParams.get('adults')).toBe('10');
  });

  it('uses adult count without fake child ages for Vrbo listing URLs', () => {
    const url = generateTravelListingUrl({
      url: 'https://www.vrbo.com/2677958?selected=75860009',
      source: 'VRBO',
      startDate: '2026-05-12',
      endDate: '2026-05-23',
      adultCount: 8,
      childCount: 4,
    });

    const parsedUrl = new URL(url ?? '');

    expect(parsedUrl.searchParams.get('adults')).toBe('8');
    expect(parsedUrl.searchParams.has('children')).toBe(false);
  });

  it('keeps Airbnb listing URLs unchanged when no trip details are present', () => {
    const url = generateTravelListingUrl({
      url: 'https://www.airbnb.com/rooms/46898739',
      source: 'AIRBNB',
    });

    expect(url).toBe('https://www.airbnb.com/rooms/46898739');
  });

  it('keeps non-travel listing URLs usable without adding travel params', () => {
    const url = generateTravelListingUrl({
      url: 'https://example.com/home/123',
      source: 'OTHER',
      startDate: '2026-05-12',
      endDate: '2026-05-23',
      numberOfPeople: 10,
    });

    expect(url).toBe('https://example.com/home/123');
  });
});
