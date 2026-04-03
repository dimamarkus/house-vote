import { z } from 'zod';
import { TripSchema } from '../../../generated/zod/trip';

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
    )
  })
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