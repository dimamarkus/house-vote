import { notFound, redirect } from 'next/navigation';
import { db } from 'db';
// Use string literals for status to avoid coupling to Prisma runtime enums
const InviteStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
} as const;
import { InvitationStatusDisplay } from '@/features/trips/components/InvitationStatusDisplay';
import { InvitePageContent } from '@/features/trips/components/InvitePageContent';

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  // Fetch invitation details
  const invitation = await db.tripInvitation.findUnique({
    where: { token },
    include: { trip: { select: { name: true } } }
  });

  // Handle not found
  if (!invitation) {
    notFound();
  }

  // Handle already ACCEPTED (redirect server-side)
  if (invitation.status === InviteStatus.ACCEPTED) {
    redirect(`/trips/${invitation.tripId}`);
  }

  // Handle EXPIRED (check and update status if needed)
  if (invitation.status === InviteStatus.PENDING && invitation.expiresAt < new Date()) {
    // Update status to EXPIRED - run this before rendering status display
    const expiredInvitation = await db.tripInvitation.update({
      where: { id: invitation.id },
      data: { status: InviteStatus.EXPIRED },
      select: { status: true, tripId: true }
    });
    return <InvitationStatusDisplay invitation={expiredInvitation} />;
  }

  // Handle other non-pending statuses (DECLINED, already EXPIRED)
  if (invitation.status !== InviteStatus.PENDING) {
    return <InvitationStatusDisplay invitation={invitation} />;
  }

  // If we reach here, the invitation is PENDING and not expired
  // Render the main content component
  return <InvitePageContent invitation={invitation} />;
}