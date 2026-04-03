'use client'; // Needs Button component

import type { TripInvitation } from 'db';
import { InviteStatus } from 'db';
import Link from 'next/link';
import { Button } from '@turbodima/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@turbodima/ui/shadcn/card';

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
    case InviteStatus.EXPIRED:
      title = 'Invitation Expired';
      description = 'This invitation has expired and is no longer valid.';
      break;
    case InviteStatus.DECLINED:
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
          <Button asChild>
            <Link href="/trips">Go to My Trips</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}