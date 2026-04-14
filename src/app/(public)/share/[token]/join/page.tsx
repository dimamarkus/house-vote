import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import {
  decodePublishedGuestSessionCookieValue,
  getPublishedGuestSessionKey,
} from '@/features/trips/constants/publishedGuestSession';
import { PublishedTripGuestPicker } from '@/features/trips/components/PublishedTripGuestPicker';
import { PublishedTripMasthead } from '@/features/trips/components/PublishedTripMasthead';
import { PublishedTripTopBar } from '@/features/trips/components/PublishedTripTopBar';
import { formatTripDateRange } from '@/features/trips/utils/formatTripDateRange';
import { publishedTrips } from '@/features/trips/publishedDb';
import { Card, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';

interface PublishedTripJoinPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function PublishedTripJoinPage({ params }: PublishedTripJoinPageProps) {
  const { token } = await params;
  const publishedTrip = await publishedTrips.getPublishedTripByToken(token);

  if (!publishedTrip) {
    notFound();
  }

  const { share } = publishedTrip;
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

  return (
    <div className="flex flex-col gap-6">
      <PublishedTripTopBar
        token={token}
        share={share}
        initialSession={initialSession}
        mode="join"
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 xl:px-8">
        <PublishedTripMasthead
          share={share}
          tripDateRange={tripDateRange}
        />
        <PublishedTripGuestPicker
          token={token}
          share={share}
          initialSession={initialSession}
        />
      </div>
    </div>
  );
}
