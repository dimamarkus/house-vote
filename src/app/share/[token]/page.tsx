import { notFound } from 'next/navigation';
import { isVoteEligibleListingStatus } from '@/features/listings/constants/listing-status';
import { formatTripDateRange } from '@/features/trips/utils/formatTripDateRange';
import { PublishedTripPageClient } from '@/features/trips/components/PublishedTripPageClient';
import { publishedTrips } from '@/features/trips/publishedDb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { CalendarDays, MapPin, Users } from 'lucide-react';

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
  const votingOptionCount = listings.filter((listing) => isVoteEligibleListingStatus(listing.status)).length;

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

  return (
    <div className="px-6 py-8 xl:px-8">
      <div className="mx-auto flex w-full max-w-none flex-col gap-6">
        <Card>
          <CardHeader className="gap-4">
            <div className="space-y-2">
              <CardTitle className="text-3xl">{share.trip.name}</CardTitle>
              {share.trip.description ? (
                <CardDescription className="max-w-3xl text-base">
                  {share.trip.description}
                </CardDescription>
              ) : (
                <CardDescription className="text-base">
                  Pick your name, choose your favorite house, and watch the results update live.
                </CardDescription>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {share.trip.location ? (
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{share.trip.location}</span>
              </div>
            ) : null}
            {tripDateRange ? (
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>{tripDateRange}</span>
              </div>
            ) : null}
            {share.trip.numberOfPeople ? (
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{share.trip.numberOfPeople} guests</span>
              </div>
            ) : null}
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium">
              <span>{votingOptionCount} option{votingOptionCount === 1 ? '' : 's'}</span>
            </div>
          </CardContent>
        </Card>

        <PublishedTripPageClient token={token} share={share} listings={listings} />
      </div>
    </div>
  );
}
