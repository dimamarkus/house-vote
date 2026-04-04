'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { db } from 'db';
import { ErrorCode } from '@/core/errors';
import { validateActionInput } from '@/core/form-data';
import { invitationFormSchema } from '../schemas';
import crypto from 'crypto';
import { TripInvitation } from 'db';
import { ApiResponse } from '@/core/types';
import { createErrorResponse, createSuccessResponse } from '@/core/responses';

type InvitationResponse = ApiResponse<TripInvitation>;

/**
 * Create an invitation for a trip
 */
export async function createInvitation(formData: FormData): Promise<InvitationResponse> {
  try {
    // 1. Authentication
    const authResult = await auth();
    if (!authResult.userId) {
      return createErrorResponse({
        error: 'You must be signed in to create an invitation',
        code: ErrorCode.UNAUTHORIZED
      });
    }
    const userId = authResult.userId;

    // 2. Validate input using standard validator
    const validationResult = validateActionInput(formData, invitationFormSchema);
    if (!validationResult.success) {
      return validationResult;
    }

    const { email, tripId } = validationResult.data;

    // 3. Check if trip exists and user has permission
    const trip = await db.trip.findUnique({
      where: { id: tripId }
    });

    if (!trip) {
      return createErrorResponse({ error: 'Trip not found', code: ErrorCode.NOT_FOUND });
    }

    if (trip.userId !== userId) {
      return createErrorResponse({ error: 'You do not have permission to invite to this trip', code: ErrorCode.FORBIDDEN });
    }

    // 4. Generate invitation
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 5. Create invitation
    const invitation = await db.tripInvitation.create({
      data: {
        email,
        token,
        expiresAt,
        trip: {
          connect: { id: tripId }
        }
      }
    });

    // 6. Invalidate cache
    revalidatePath(`/trips/${tripId}`);

    // TODO: Send email with invitation link

    return createSuccessResponse({ data: invitation });

  } catch (error) {
    console.error('Failed to create invitation:', error);
    return createErrorResponse({ error, code: ErrorCode.DATABASE_ERROR });
  }
}