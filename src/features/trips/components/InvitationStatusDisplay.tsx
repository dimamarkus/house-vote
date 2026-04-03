'use client'; // Needs Button component

import type { TripInvitation } from 'db';
import { LinkButton } from '@turbodima/ui/core/LinkButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@turbodima/ui/shadcn/card';
import { INVITE_STATUS } from '../constants/invite-status';

interface InvitationStatusDisplayProps {
  invitation: Pick<TripInvitation, 'status' | 'tripId'>;
}

/**
 * Displays a card indicating the status of a non-pending invitation (Expired, Declined).
 * The ACCEPTED case should ideally be handled by a redirect in the page component.
 */
export function InvitationStatusDisplay({ invitation }: InvitationStatusDisplayProps) {
  let title: string;
  let description: string;

  switch (invitation.status) {
    case INVITE_STATUS.EXPIRED:
      title = 'Invitation Expired';
      description = 'This invitation has expired and is no longer valid.';
      break;
    case INVITE_STATUS.DECLINED:
      title = 'Invitation Declined';
      description = 'This invitation has been declined.';
      break;
    // Add other non-pending, non-accepted statuses if needed
    default:
      // Should not happen if used correctly, but provide a fallback
      title = 'Invitation Invalid';
      description = 'This invitation is no longer valid.';
      break;
  }

  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <LinkButton href="/trips">Go to My Trips</LinkButton>
        </CardContent>
      </Card>
    </div>
  );
}