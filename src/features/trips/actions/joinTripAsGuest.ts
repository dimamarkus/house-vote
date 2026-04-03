'use server';

import { z } from 'zod';
import { db } from 'db';
import { ErrorCode } from '@turbodima/core/errors';
import { createErrorResponse, createSuccessResponse } from '@turbodima/core/responses';
import { ApiResponse } from '@turbodima/core/types';
import { InviteStatus, Prisma } from 'db';
import { validateActionInput } from '@turbodima/core/form-data';

// Input schema for the action
const joinGuestSchema = z.object({
  token: z.string().uuid("Invalid invitation link."),
  displayName: z.string().trim().min(1, "Name cannot be empty.").max(50, "Name too long."),
});

type JoinGuestResponse = ApiResponse<{ tripId: string; guestName: string }>;

// Server action
export async function joinTripAsGuest(
  formData: FormData
): Promise<JoinGuestResponse> {
  // 1. Validate Input using standard validator
  const validationResult = validateActionInput(formData, joinGuestSchema);
  if (!validationResult.success) {
    // Directly return the error response from the validator
    return validationResult;
  }

  const { token, displayName } = validationResult.data;

  try {
    // Use a transaction for validation and creation
    const result = await db.$transaction(async (tx) => {
      // 2. Validate Token
      const invitation = await tx.tripInvitation.findUnique({
        where: { token },
        select: { id: true, tripId: true, email: true, status: true, expiresAt: true },
      });

      if (!invitation) {
        throw new Error('Invitation not found.');
      }
      if (invitation.email !== null && invitation.email !== '') {
        throw new Error('This invitation requires sign-in.');
      }
      if (invitation.status !== InviteStatus.PENDING) {
        throw new Error('Invitation already used or declined.');
      }
      if (invitation.expiresAt < new Date()) {
        // Update expired status (best effort, don't block join failure)
        await tx.tripInvitation.update({ where: { id: invitation.id }, data: { status: InviteStatus.EXPIRED } }).catch();
        throw new Error('Invitation has expired.');
      }

      // 3. Create TripGuest record
      try {
        await tx.tripGuest.create({
          data: {
            tripId: invitation.tripId,
            guestDisplayName: displayName,
          },
        });
      } catch (error) {
        // Handle potential unique constraint violation (name already taken for this trip)
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new Error(`The name "${displayName}" is already taken for this trip. Please choose another.`);
        }
        throw error; // Re-throw other errors
      }

      // 4. Optionally update invitation status (if desired)
      // await tx.tripInvitation.update({ where: { id: invitation.id }, data: { status: InviteStatus.ACCEPTED } });

      return { tripId: invitation.tripId, guestName: displayName };
    });

    // Use createSuccessResponse
    return createSuccessResponse({ data: result });

  } catch (error) {
    return createErrorResponse({
      error: error instanceof Error ? error.message : 'Failed to join trip as guest.',
      code: ErrorCode.PROCESSING_ERROR,
    });
  }
}