'use server';

import { currentUser } from '@clerk/nextjs/server';
import { createErrorResponse, createSuccessResponse } from '@/core/responses';
import { ErrorCode } from '@/core/errors';
import { trips } from '../db'; // Assuming db operations are in ../db
import { TripInvitation } from 'db';
import { ApiResponse } from '@/core/types';

export type GenerateShareableInviteResponse = ApiResponse<Pick<TripInvitation, 'token'>>;

export async function generateShareableInvite(
  tripId: string
): Promise<GenerateShareableInviteResponse> {
  try {
    // Get current user using Clerk's currentUser() API
    const user = await currentUser();

    // Check if user is authenticated
    if (!user || !user.id) {
      // Use createErrorResponse for unauthorized access
      return createErrorResponse({
        error: 'User not authenticated',
        code: ErrorCode.UNAUTHORIZED,
      });
    }

    // 2. Database operation (Find or Create)
    const result = await trips.findOrCreateShareableInvite(tripId, user.id);

    if (!result.success) {
      // Propagate DB operation error
      return result;
    }

    // 3. Cache invalidation (Optional: If showing invites list somewhere)
    // revalidatePath(`/trips/${tripId}`);
    // revalidatePath(`/trips/${tripId}/invitations`);

    // 4. Return success response with only the token using helper
    return createSuccessResponse({ data: { token: result.data.token } });

  } catch (error) {
    // 5. Error handling
    return createErrorResponse({
      error: error instanceof Error ? error : new Error('Failed to generate shareable invite link'),
      code: ErrorCode.PROCESSING_ERROR,
    });
  }
}