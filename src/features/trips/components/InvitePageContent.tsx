// No directive needed, assuming server component by default

import type { Trip, TripInvitation } from 'db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { GuestJoinForm } from '../forms/GuestJoinForm';
import { EmailInviteActions } from './EmailInviteActions'; // Import the new component

interface InvitePageContentProps {
  invitation: TripInvitation & { trip: Pick<Trip, 'name'> };
}

/**
 * Renders the main content for a valid, pending trip invitation.
 * Shows email-specific details and actions or the guest join form.
 */
export function InvitePageContent({ invitation }: InvitePageContentProps) {
  return (
    <div className="container max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle>Trip Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to collaborate on the trip <strong>{invitation.trip.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitation.email ? (
            // Email-based invite flow
            <>
              <p className="mb-6">
                This invitation was sent to <strong>{invitation.email}</strong>.
                Accepting will link this trip to your account.
              </p>
              {/* Use the extracted component */}
              <EmailInviteActions token={invitation.token} />
            </>
          ) : (
            // Guest flow (shareable link)
            <GuestJoinForm token={invitation.token} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}