import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
  decodePublishedGuestSessionCookieValue,
  getPublishedGuestSessionKey,
} from '@/features/trips/constants/publishedGuestSession';
import { PublishedTripHeaderListingForm } from '@/features/trips/components/PublishedTripHeaderListingForm';
import { PublishedTripGuestsSheet } from '@/features/trips/components/PublishedTripGuestsSheet';
import { PublishedTripMasthead } from '@/features/trips/components/PublishedTripMasthead';
import { PublishedTripTopBar } from '@/features/trips/components/PublishedTripTopBar';
import { formatTripDateRange } from '@/features/trips/utils/formatTripDateRange';
import { PublishedTripPageClient } from '@/features/trips/components/PublishedTripPageClient';
import { publishedTrips } from '@/features/trips/publishedDb';
import { Card, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';

interface PublishedTripPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function PublishedTripPage({ params }: PublishedTripPageProps) {
  const { token } = await params;
  const publishedTrip = await publishedTrips.getPublishedTripByToken(token);

  if (!publishedTrip) {
    notFound();
  }

  const { share, listings } = publishedTrip;
  const tripDateRange = formatTripDateRange(share.trip.startDate, share.trip.endDate);

  if (!share.isPublished) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-6 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Voting is not live right now</CardTitle>
            <CardDescription>
              The trip owner has unpublished this voting page or rotated the link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const cookieStore = await cookies();
  const initialSession = decodePublishedGuestSessionCookieValue(
    cookieStore.get(getPublishedGuestSessionKey(share.trip.id))?.value,
  );

  if (!initialSession) {
    redirect(`/share/${token}/join`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PublishedTripTopBar
        token={token}
        share={share}
        initialSession={initialSession}
        mode="board"
      />
      <div className="mx-auto flex w-full max-w-none flex-col gap-6 px-6 py-8 2xl:px-10">
        <PublishedTripMasthead
          share={share}
          tripDateRange={tripDateRange}
          guestDetailsSlot={(
            <PublishedTripGuestsSheet
              share={share}
              listings={listings}
              initialSession={initialSession}
            />
          )}
          actionSlot={(
            <PublishedTripHeaderListingForm
              token={token}
              share={share}
              className="w-full"
              initialSession={initialSession}
            />
          )}
        />
        <PublishedTripPageClient
          token={token}
          share={share}
          listings={listings}
          initialSession={initialSession}
        />
      </div>
    </div>
  );
}
