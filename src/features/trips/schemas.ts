import { z } from 'zod';
import { normalizeTripGuestBreakdown } from './utils/tripTravelContext';

const optionalNonNegativeInteger = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.coerce.number().int().min(0).optional().nullable(),
);

export const TripSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(3, { message: "Trip name must be at least 3 characters" }),
  description: z.string().nullable().optional(),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  location: z.string().nullable().optional(),
  numberOfPeople: z.number().int().positive().nullable().optional(),
  adultCount: z.number().int().nonnegative().nullable().optional(),
  childCount: z.number().int().nonnegative().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  userId: z.string(),
});

// Extend the generated schema with custom validation
export const TripWithDateValidation = TripSchema.refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  {
    message: "End date must be after start date",
    path: ["endDate"]
  }
);

// Form schema for creating/updating trips (omits server-generated fields)
export const TripFormSchema = TripSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true
  })
  .extend({
    // Preprocess empty strings to undefined before coercing/validating
    startDate: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.date().optional().nullable()
    ),
    endDate: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.date().optional().nullable()
    ),
    numberOfPeople: z.preprocess(
      (val) => (val === "" ? undefined : val),
      z.coerce.number().int().positive().optional().nullable()
    ),
    adultCount: optionalNonNegativeInteger,
    childCount: optionalNonNegativeInteger,
  })
  .transform((data) => ({
    ...data,
    ...normalizeTripGuestBreakdown(data),
  }))
  .refine(
    (data) => (
      data.numberOfPeople !== null ||
      (data.adultCount === null && data.childCount === null)
    ),
    {
      message: "Enter at least one adult or child",
      path: ["adultCount"]
    }
  )
  .refine(
    (data) => data.numberOfPeople === null || (data.adultCount ?? 0) > 0,
    {
      message: "Enter at least one adult",
      path: ["adultCount"]
    }
  )
  .refine(
    (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: "End date must be after start date",
      path: ["endDate"]
    }
  );

// Types
export type TripFormData = z.infer<typeof TripFormSchema>;

// Invitation form schema
export const invitationFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  tripId: z.string().cuid({ message: "Invalid trip ID" })
});

export type InvitationFormData = z.infer<typeof invitationFormSchema>;

// Accept/Decline invitation schema
export const invitationResponseSchema = z.object({
  token: z.string(),
  accept: z.boolean()
});

export type InvitationResponseData = z.infer<typeof invitationResponseSchema>;