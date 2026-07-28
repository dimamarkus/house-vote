/**
 * Mirrors the Prisma `PartyUnit` enum. Kept as a local string union so this
 * helper (and its tests) don't need a generated client import.
 */
export type PartyUnit = 'GUEST' | 'FAMILY';

export const DEFAULT_PARTY_UNIT: PartyUnit = 'GUEST';

export const PARTY_UNIT_VALUES = ['GUEST', 'FAMILY'] as const satisfies ReadonlyArray<PartyUnit>;

export function isPartyUnit(value: unknown): value is PartyUnit {
  return value === 'GUEST' || value === 'FAMILY';
}

export function normalizePartyUnit(value: unknown): PartyUnit {
  return isPartyUnit(value) ? value : DEFAULT_PARTY_UNIT;
}

export interface PartyUnitLabels {
  singular: string;
  plural: string;
  Singular: string;
  Plural: string;
  /** Toggle / basis label, e.g. "Per guest". */
  perUnit: string;
  /** Short unit next to a price amount, e.g. "/ guest". */
  perUnitShort: string;
}

const LABELS_BY_UNIT: Record<PartyUnit, PartyUnitLabels> = {
  GUEST: {
    singular: 'guest',
    plural: 'guests',
    Singular: 'Guest',
    Plural: 'Guests',
    perUnit: 'Per guest',
    perUnitShort: '/ guest',
  },
  FAMILY: {
    singular: 'family',
    plural: 'families',
    Singular: 'Family',
    Plural: 'Families',
    perUnit: 'Per family',
    perUnitShort: '/ family',
  },
};

export function getPartyUnitLabels(partyUnit: PartyUnit | null | undefined): PartyUnitLabels {
  return LABELS_BY_UNIT[normalizePartyUnit(partyUnit)];
}

/** e.g. "5 families" / "1 guest". */
export function formatPartyUnitCount(
  count: number,
  partyUnit: PartyUnit | null | undefined,
): string {
  const labels = getPartyUnitLabels(partyUnit);
  return `${count} ${count === 1 ? labels.singular : labels.plural}`;
}
