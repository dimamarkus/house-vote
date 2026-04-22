'use server';

import { z } from 'zod';
import { db } from 'db';
import { ErrorCode } from '@/core/errors';
import { createErrorResponse, createSuccessResponse } from '@/core/responses';
import { ApiResponse } from '@/core/types';
import { InviteStatus, Prisma } from 'db';
import { validateActionInput } from '@/core/form-data';

const joinGuestSchema = z.object({
  token: z.string().uuid("Invalid invitation link."),
  displayName: z.string().trim().min(1, "Name cannot be empty.").max(50, "Name too long."),
});

type JoinGuestResponse = ApiResponse<{ tripId: string; guestName: string }>;

export async function joinTripAsGuest(
  formData: FormData
): Promise<JoinGuestResponse> {
  const validationResult = validateActionInput(formData, joinGuestSchema);
  if (!validationResult.success) {
    return validationResult;
  }

  const { token, displayName } = validationResult.data;

  try {
    const result = await db.$transaction(async (tx) => {
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
        throw new Error('Invitation has expired.');
      }

      try {
        await tx.tripGuest.create({
          data: {
            tripId: invitation.tripId,
            guestDisplayName: displayName,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new Error(`The name "${displayName}" is already taken for this trip. Please choose another.`);
        }
        throw error;
      }

      return { tripId: invitation.tripId, guestName: displayName };
    });

    return createSuccessResponse({ data: result });

  } catch (error) {
    return createErrorResponse({
      error: error instanceof Error ? error.message : 'Failed to join trip as guest.',
      code: ErrorCode.PROCESSING_ERROR,
    });
  }
}