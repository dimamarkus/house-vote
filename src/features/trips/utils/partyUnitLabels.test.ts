import { describe, expect, it } from 'vitest';
import {
  formatPartyUnitCount,
  getPartyUnitLabels,
  isPartyUnit,
  normalizePartyUnit,
} from './partyUnitLabels';

describe('partyUnitLabels', () => {
  it('normalizes unknown values to GUEST', () => {
    expect(normalizePartyUnit('nope')).toBe('GUEST');
    expect(isPartyUnit('FAMILY')).toBe(true);
  });

  it('returns family labels when party unit is FAMILY', () => {
    expect(getPartyUnitLabels('FAMILY')).toMatchObject({
      singular: 'family',
      plural: 'families',
      perUnit: 'Per family',
      perUnitShort: '/ family',
    });
  });

  it('formats counts with the right pluralization', () => {
    expect(formatPartyUnitCount(1, 'FAMILY')).toBe('1 family');
    expect(formatPartyUnitCount(5, 'FAMILY')).toBe('5 families');
    expect(formatPartyUnitCount(1, 'GUEST')).toBe('1 guest');
  });
});
