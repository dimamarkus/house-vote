import { z } from 'zod';

export const ListingImportSourceSchema = z.enum([
  'MANUAL',
  'AIRBNB',
  'VRBO',
  'BOOKING',
  'UNKNOWN',
  'OTHER',
]);

export const ListingImportMethodSchema = z.enum(['MANUAL', 'URL_FETCH', 'EXTENSION']);

export const ListingImportStatusSchema = z.enum(['NOT_IMPORTED', 'PARTIAL', 'COMPLETE', 'FAILED']);

const ImportedNumericFieldSchema = z.union([z.number(), z.string()]).nullable().optional();

/**
 * Raw, pre-normalized price context the scraper observed. The basis tells the
 * normalizer whether the `price` field is already per-night ("NIGHTLY") or
 * represents a total stay ("TOTAL") that needs to be divided by `nights`.
 * Dates are ISO strings so the payload stays JSON-safe for Chrome extension
 * / cross-process transport.
 */
export const ImportedPriceMetaSchema = z.object({
  basis: z.enum(['NIGHTLY', 'TOTAL']),
  nights: z.number().int().positive().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export const ListingImportCaptureSchema = z.object({
  source: ListingImportSourceSchema.optional(),
  url: z.string().url({ message: 'A valid listing URL is required.' }),
  title: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  price: ImportedNumericFieldSchema,
  priceMeta: ImportedPriceMetaSchema.nullable().optional(),
  bedroomCount: ImportedNumericFieldSchema,
  bedCount: ImportedNumericFieldSchema,
  bathroomCount: ImportedNumericFieldSchema,
  sourceDescription: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  imageUrl: z.string().trim().nullable().optional(),
  photoUrls: z.array(z.string().trim()).optional(),
  roomBreakdown: z
    .object({
      summary: z.string().nullable().optional(),
      rooms: z.array(
        z.object({
          name: z.string(),
          beds: z.string(),
          imageUrl: z.string().trim().nullable().optional(),
        }),
      ),
    })
    .nullable()
    .optional(),
  rawPayload: z.unknown().optional(),
});

export const UrlImportInputSchema = z.object({
  url: z.string().url({ message: 'A valid listing URL is required.' }),
  tripId: z.string().cuid({ message: 'A valid trip id is required.' }),
});

export const ListingImportRequestSchema = z.object({
  tripId: z.string().cuid({ message: 'A valid trip id is required.' }),
  importToken: z.string().min(1, { message: 'Import token is required.' }),
  capture: ListingImportCaptureSchema,
});

export const ExtensionListingImportRequestSchema = z.object({
  tripId: z.string().cuid({ message: 'A valid trip id is required.' }),
  capture: ListingImportCaptureSchema,
});
