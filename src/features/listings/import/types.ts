import { z } from 'zod';
import {
  ListingImportCaptureSchema,
  ListingImportMethodSchema,
  ListingImportRequestSchema,
  ListingImportSourceSchema,
  ListingImportStatusSchema,
  UrlImportInputSchema,
} from './schemas';

export type ListingImportCapture = z.infer<typeof ListingImportCaptureSchema>;

export type ListingImportMethodValue = z.infer<typeof ListingImportMethodSchema>;

export type ListingImportRequest = z.infer<typeof ListingImportRequestSchema>;

export type ListingImportSourceValue = z.infer<typeof ListingImportSourceSchema>;

export type ListingImportStatusValue = z.infer<typeof ListingImportStatusSchema>;

export type UrlImportInput = z.infer<typeof UrlImportInputSchema>;

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
  title: string;
  address: string | null;
  price: number | null;
  bedroomCount: number | null;
  bedCount: number | null;
  bathroomCount: number | null;
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
