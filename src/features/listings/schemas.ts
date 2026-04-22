import { z } from 'zod';
import { LISTING_TYPE_VALUES } from './listingTypeOptions';

export const ListingTypeSchema = z.enum(LISTING_TYPE_VALUES);

export const ListingSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(1, { message: "Title cannot be empty" }),
  listingType: ListingTypeSchema.optional(),
  address: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  price: z.number().int().nullable().optional(),
  bedroomCount: z.number().int().nullable().optional(),
  bedCount: z.number().int().nullable().optional(),
  bathroomCount: z.number().int().nullable().optional(),
  sourceDescription: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  addedById: z.string().nullable().optional(),
  addedByGuestName: z.string().nullable().optional(),
  tripId: z.string().cuid(),
  status: z.enum(['POTENTIAL', 'REJECTED']),
});

/**
 * Schema for the main Listing form data (create/update)
 * Derived from the generated ListingSchema by omitting server-managed fields.
 */
export const ListingFormDataSchema = ListingSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  addedById: true,        // Assuming this is set server-side based on logged-in user
  addedByGuestName: true, // Assuming this is set server-side for guests
  latitude: true,         // Assuming this might be derived from address server-side
  longitude: true,        // Assuming this might be derived from address server-side
  status: true            // Status likely managed separately or server-side
}).extend({
  price: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().nullable().optional()
  ),
  bedroomCount: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().nullable().optional()
  ),
  bedCount: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().nullable().optional()
  ),
  bathroomCount: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.coerce.number().int().nullable().optional()
  ),
});

export type ListingFormData = z.infer<typeof ListingFormDataSchema>;

// Schema for the simple status update - kept separate
export const ListingStatusUpdateSchema = z.object({
  status: z.enum(['POTENTIAL', 'REJECTED']),
});

export type ListingStatusUpdateData = z.infer<typeof ListingStatusUpdateSchema>;

// Infer the full type from the generated Zod schema
// This includes all fields, used for form's initialState
export type ListingFormValues = z.infer<typeof ListingSchema>;
