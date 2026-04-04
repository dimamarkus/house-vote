import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractListingCaptureFromHtml } from './extractListingCaptureFromHtml';

function readFixture(filename: string): string {
  return readFileSync(resolve(process.cwd(), filename), 'utf8');
}

describe('extractListingCaptureFromHtml', () => {
  it('parses the Airbnb fixture with key listing details', () => {
    const result = extractListingCaptureFromHtml(
      readFixture('example-airbnb.html'),
      'https://www.airbnb.com/rooms/12345678?foo=bar',
    );

    expect(result.capture.source).toBe('AIRBNB');
    expect(result.capture.title).toBe('Emberwood — Spa/Theater/Games/Karaoke/Speakeasy');
    expect(result.capture.address).toBe('Entire cabin in Albrightsville, Pennsylvania');
    expect(result.capture.price).toBe('2,800');
    expect(result.capture.bedroomCount).toBe('7');
    expect(result.capture.bedCount).toBe('13');
    expect(result.capture.photoUrls?.length ?? 0).toBeGreaterThan(3);
    expect(result.debug.title.winner).toBe('source-hint');
    expect(result.debug.price.winner).toBe('source-hint');
  });

  it('parses the VRBO fixture with price, counts, and gallery images', () => {
    const result = extractListingCaptureFromHtml(
      readFixture('example-vrbo.html'),
      'https://www.vrbo.com/1234567ha?foo=bar',
    );

    expect(result.capture.source).toBe('VRBO');
    expect(result.capture.title).toBe(
      'Sleeps 30! Denver Rally House w/ Game Rooms, Hot Tub, Private Chef & 420 Shuttle',
    );
    expect(result.capture.address).toBe('Denver, CO');
    expect(result.capture.price).toBe('2,204');
    expect(result.capture.bedroomCount).toBe('6');
    expect(result.capture.bathroomCount).toBe('4');
    expect(result.capture.photoUrls?.length ?? 0).toBeGreaterThan(1);
    expect((result.capture.photoUrls ?? []).every((url) => !url.endsWith('.svg'))).toBe(true);
    expect(result.capture.notes).toContain('VRBO property id: 120034881');
    expect(result.debug.price.winner).toBe('source-hint');
  });
});
