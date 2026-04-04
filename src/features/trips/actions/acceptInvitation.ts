'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { db } from 'db';
import { validateActionInput } from '@/core/form-data';
import { invitationResponseSchema } from '../schemas';
import { InviteStatus } from 'db';
import { redirect } from 'next/navigation';

/**
 * Accept or decline an invitation
 */
export async function handleInvitation(formData: FormData) {
  let tripIdForRedirect: string | null = null;
  try {
    // 1. Authentication
    const authResult = await auth();
    if (!authResult.userId) {
      throw new Error('You must be signed in to process an invitation');
    }
    const userId = authResult.userId;

    // 2. Validate input using standard validator
    const validationResult = validateActionInput(formData, invitationResponseSchema);
    if (!validationResult.success) {
      console.error("Invitation form validation failed:", validationResult.error, validationResult.fieldErrors);
      throw new Error('Invalid form data');
    }

    const { token, accept } = validationResult.data;

    // 3. Fetch invitation
    const invitation = await db.tripInvitation.findUnique({
      where: { token },
      include: { trip: true }
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }
    tripIdForRedirect = invitation.tripId;

    // 4. Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      await db.tripInvitation.update({
        where: { id: invitation.id },
        data: { status: InviteStatus.EXPIRED }
      });
      throw new Error('This invitation has expired');
    }

    // 5. Update invitation status
    const newStatus = accept ? InviteStatus.ACCEPTED : InviteStatus.DECLINED;

    await db.tripInvitation.update({
      where: { id: invitation.id },
      data: { status: newStatus }
    });

    // 6. If accepted, add user as collaborator
    if (accept) {
      await db.trip.update({
        where: { id: invitation.tripId },
        data: {
          collaborators: {
            connect: { id: userId }
          }
        }
      });
    }

    // 7. Revalidate paths
    revalidatePath(`/trips/${invitation.tripId}`);
    revalidatePath('/trips');

    // 8. Redirect based on action
    if (accept) {
      redirect(`/trips/${invitation.tripId}`);
    } else {
      redirect('/trips?status=declined');
    }
  } catch (error) {
    console.error('Failed to process invitation:', error);
    const errorMessage = encodeURIComponent(
      error instanceof Error ? error.message : 'Failed to process invitation',
    );
    const redirectPath = tripIdForRedirect ? `/trips/${tripIdForRedirect}` : '/trips';
    redirect(`${redirectPath}?error=${errorMessage}`);
  }
}