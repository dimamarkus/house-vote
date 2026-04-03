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
  source: ListingImportSourceValue;
  importMethod: ListingImportMethodValue;
  importStatus: ListingImportStatusValue;
  sourceExternalId: string | null;
  rawImportPayload: unknown;
}
