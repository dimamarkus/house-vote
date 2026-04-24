import { z } from 'zod';
import type { NightlyPriceSource as PrismaNightlyPriceSource } from 'db';
import {
  ImportedPriceMetaSchema,
  ListingImportCaptureSchema,
  ListingImportMethodSchema,
  ListingImportRequestSchema,
  ListingImportSourceSchema,
  ListingImportStatusSchema,
  UrlImportInputSchema,
} from './schemas';

export type ListingImportCapture = z.infer<typeof ListingImportCaptureSchema>;

export type ImportedPriceMeta = z.infer<typeof ImportedPriceMetaSchema>;

export type ListingImportMethodValue = z.infer<typeof ListingImportMethodSchema>;

export type ListingImportRequest = z.infer<typeof ListingImportRequestSchema>;

export type ListingImportSourceValue = z.infer<typeof ListingImportSourceSchema>;

export type ListingImportStatusValue = z.infer<typeof ListingImportStatusSchema>;

export type UrlImportInput = z.infer<typeof UrlImportInputSchema>;

/**
 * Client-safe mirror of the Prisma `NightlyPriceSource` enum. Using a literal
 * tuple + `satisfies` means UI / zod code doesn't need to value-import `db`
 * (which would drag `pg` into the client bundle). The `satisfies` guard fails
 * the build if Prisma's enum drifts from this tuple.
 */
export const NIGHTLY_PRICE_SOURCE_VALUES = [
  'SCRAPED_NIGHTLY',
  'DERIVED_FROM_TOTAL',
  'MANUAL',
] as const satisfies ReadonlyArray<PrismaNightlyPriceSource>;

export type NightlyPriceSourceValue = (typeof NIGHTLY_PRICE_SOURCE_VALUES)[number];

export interface ListingImportDebugField {
  winner: string | null;
  candidates: Array<{
    label: string;
    value: string | null;
  }>;
}

export interface ListingImportDebugInfo {
  parserVersion: string;
  source: ListingImportSourceValue;
  hostname: string | null;
  canonicalUrl: string;
  title: ListingImportDebugField;
  address: ListingImportDebugField;
  price: ListingImportDebugField;
  photoCount: number;
  structuredDataTypes: string[];
  selectorSignals: Record<string, string[]>;
  sourceSignals: Record<string, unknown>;
  amenitySummary: string[];
}

export interface RoomBreakdownEntry {
  name: string;
  beds: string;
  imageUrl?: string | null;
}

export interface RoomBreakdown {
  summary: string | null;
  rooms: RoomBreakdownEntry[];
}

export interface NormalizedImportedListing {
  canonicalUrl: string;
  /**
   * The scraped title, or `null` when every signal (source-hint / meta /
   * structured data / selector) came back empty. Fresh URL imports reject
   * listings with `title === null`; refresh flows preserve the existing
   * title on the record and never persist a null. The DB column itself is
   * still non-null — anything that reaches `upsertImportedListing` has a
   * real title by then.
   */
  title: string | null;
  address: string | null;
  price: number | null;
  nightlyPriceSource: NightlyPriceSourceValue | null;
  priceQuotedStartDate: Date | null;
  priceQuotedEndDate: Date | null;
  bedroomCount: number | null;
  bedCount: number | null;
  bathroomCount: number | null;
  sourceDescription: string | null;
  notes: string | null;
  imageUrl: string | null;
  photoUrls: string[];
  roomBreakdown: RoomBreakdown | null;
  source: ListingImportSourceValue;
  importMethod: ListingImportMethodValue;
  importStatus: ListingImportStatusValue;
  sourceExternalId: string | null;
  rawImportPayload: unknown;
}

export interface ListingImportResult {
  listingId: string;
  listingTitle: string;
  tripId: string;
  tripPath: string;
  source: ListingImportSourceValue;
  importStatus: ListingImportStatusValue;
  missingFields: string[];
  debug: ListingImportDebugInfo | null;
}
