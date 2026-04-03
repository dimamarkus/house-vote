import { z } from 'zod';
import { ListingSchema } from '../../../generated/zod/listing';

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
