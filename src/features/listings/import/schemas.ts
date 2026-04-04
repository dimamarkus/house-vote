import { z } from 'zod';

export const ListingImportSourceSchema = z.enum(['MANUAL', 'AIRBNB', 'VRBO', 'UNKNOWN']);

export const ListingImportMethodSchema = z.enum(['MANUAL', 'URL_FETCH', 'EXTENSION']);

export const ListingImportStatusSchema = z.enum(['NOT_IMPORTED', 'PARTIAL', 'COMPLETE', 'FAILED']);

const ImportedNumericFieldSchema = z.union([z.number(), z.string()]).nullable().optional();

export const ListingImportCaptureSchema = z.object({
  source: ListingImportSourceSchema.optional(),
  url: z.string().url({ message: 'A valid listing URL is required.' }),
  title: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  price: ImportedNumericFieldSchema,
  bedroomCount: ImportedNumericFieldSchema,
  bedCount: ImportedNumericFieldSchema,
  bathroomCount: ImportedNumericFieldSchema,
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
