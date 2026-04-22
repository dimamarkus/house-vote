import { checkUserLike } from '@/features/likes/actions/checkUserLike';
import { getListingsByTrip } from '@/features/listings/actions/getListingsByTrip';
import type { ListingWithMedia } from '@/features/listings/types';
import { getTrip } from '@/features/trips/actions/getTrip';
import { getTripGuests } from '@/features/trips/actions/getTripGuests';
import { publishedTrips } from '@/features/trips/publishedDb';
import { TripContentArea } from '@/features/trips/components/TripContentArea';
import { TripSidebar } from '@/features/trips/components/TripSidebar';
import { TripHeader } from '@/features/trips/components/TripHeader';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from 'db';
import type { Trip, User } from 'db';
import { processSearchParams } from '@/core/search-params';
import type { SearchParams } from '@/core/types';
import { Card, CardContent } from '@/ui/shadcn/card';
import { LinkButton } from '@/ui/core/LinkButton';

const allowedSortByFields: ReadonlyArray<Prisma.ListingScalarFieldEnum> = [
  'id', 'createdAt', 'updatedAt', 'address', 'url', 'price', 'notes', 'addedById', 'tripId', 'status'
];

interface TripWithIncludes extends Trip {
  collaborators: User[];
  user: User | null;
}

type CustomProcessedParams = {
    view: 'table' | 'map' | 'card';
}

interface TripDashboardPageProps {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<SearchParams<Prisma.ListingScalarFieldEnum>>;
}

export default async function TripDashboardPage({ params, searchParams }: TripDashboardPageProps) {
  const resolvedParams = await params;
  const currentTripId = resolvedParams.tripId;

  const { query, page, limit, sortBy, sortOrder, view } = await processSearchParams<
    Prisma.ListingScalarFieldEnum,
    CustomProcessedParams,
    SearchParams<Prisma.ListingScalarFieldEnum>
  >(
    searchParams,
    {
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
      processCustomParams: (raw) => ({
          view: (raw.view === 'map' || raw.view === 'card') ? raw.view : 'table'
      }),
    }
  );

  const validatedSortBy = allowedSortByFields.includes(sortBy as Prisma.ListingScalarFieldEnum)
    ? sortBy
    : 'createdAt';

  const authData = await auth();
  const userId = authData.userId;

  let trip: TripWithIncludes | null = null;
  let listings: ListingWithMedia[] = [];
  let guestNames: string[] = [];
  let userLikes: Record<string, boolean> = {};
  let publishedShareSummary:
    | {
        share: {
          token: string;
          isPublished: boolean;
          votingOpen: boolean;
          commentsOpen: boolean;
          allowGuestSuggestions: boolean;
        } | null;
        listings: Array<{
          id: string;
          title: string;
          status: string;
        }>;
        comments: Array<{
          id: string;
          kind: 'COMMENT' | 'PRO' | 'CON';
          body: string;
          createdAt: Date;
          hiddenAt: Date | null;
          guest: {
            id: string;
            guestDisplayName: string;
          };
          listing: {
            id: string;
            title: string;
          };
        }>;
        guests: Array<{
          id: string;
          guestDisplayName: string;
          source: 'OWNER_ADDED';
          votes: Array<{
            listingId: string;
          }>;
        }>;
      }
    | undefined;
  let fetchError: string | null = null;

  try {
    const tripResponse = await getTrip(currentTripId);
    if (!tripResponse.success || !tripResponse.data || Array.isArray(tripResponse.data)) {
         const errorMessage = tripResponse.success === false && typeof tripResponse.error === 'string'
           ? tripResponse.error
           : 'Failed to fetch trip or invalid data format.';
         throw new Error(errorMessage);
    }
    trip = tripResponse.data as TripWithIncludes;
    const isOwner = userId === trip.userId;

    const guestNamesResponse = await getTripGuests(currentTripId);
    if (guestNamesResponse.success && Array.isArray(guestNamesResponse.data)) {
        guestNames = guestNamesResponse.data as string[];
    }

    if (isOwner && userId) {
        const shareSummary = await publishedTrips.getOwnerTripShareSummary(currentTripId, userId);
        publishedShareSummary = {
          share: shareSummary.share ? {
            token: shareSummary.share.token,
            isPublished: shareSummary.share.isPublished,
            votingOpen: shareSummary.share.votingOpen,
            commentsOpen: shareSummary.share.commentsOpen,
            allowGuestSuggestions: shareSummary.share.allowGuestSuggestions,
          } : null,
          listings: shareSummary.listings.map((listing) => ({
            id: listing.id,
            title: listing.title,
            status: listing.status,
          })),
          comments: shareSummary.comments.map((comment) => ({
            id: comment.id,
            kind: comment.kind,
            body: comment.body,
            createdAt: comment.createdAt,
            hiddenAt: comment.hiddenAt,
            guest: {
              id: comment.guest.id,
              guestDisplayName: comment.guest.guestDisplayName,
            },
            listing: {
              id: comment.listing.id,
              title: comment.listing.title,
            },
          })),
          guests: shareSummary.share?.guests.map((guest) => ({
            id: guest.id,
            guestDisplayName: guest.guestDisplayName,
            source: guest.source,
            votes: guest.votes.map((vote) => ({
              listingId: vote.listingId,
            })),
          })) ?? [],
        };
    }

    const listingsResponse = await getListingsByTrip(currentTripId, {
        page,
        search: query,
        limit,
        sortBy: validatedSortBy,
        sortOrder,
    });

    if (listingsResponse.success && listingsResponse.data) {
        listings = (listingsResponse.data || []) as ListingWithMedia[];

        if (userId && listings.length > 0) {
            const likePromises = listings.map(async (listing) => {
                const likeResponse = await checkUserLike(listing.id);
                if (!likeResponse.success) {
                    throw new Error(
                        typeof likeResponse.error === 'string'
                            ? likeResponse.error
                            : `Failed to check like status for listing ${listing.id}`,
                    );
                }
                if (typeof likeResponse.data !== 'boolean') {
                    throw new Error(`Unexpected like response shape for listing ${listing.id}`);
                }
                return [listing.id, likeResponse.data] as const;
            });
            const results = await Promise.all(likePromises);
            userLikes = Object.fromEntries(results);
        }
    }

  } catch (err) {
    console.error("Error fetching trip data:", err);
    fetchError = err instanceof Error ? err.message : 'An unexpected error occurred';
  }

  if (fetchError || !trip) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Error: {fetchError || 'Trip not found'}</h1>
            <p className="mb-6">There was an issue loading this trip. Try going back to your trips list.</p>
            <div className="mb-4">
              <LinkButton href="/trips" weight="hollow">
                Back to Trips
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwner = userId === trip.userId;
  const currentGuestName = null;

  return (
    <div className="p-6">
      <TripHeader trip={trip} />

      <div className="space-y-6 xl:grid xl:grid-cols-[minmax(0,1fr)_560px] xl:items-start xl:gap-6 xl:space-y-0">
        <aside className="xl:order-2 xl:self-start">
          <TripSidebar
            trip={trip}
            guestNames={guestNames}
            currentGuestName={currentGuestName}
            isOwner={isOwner}
            publishedShareSummary={publishedShareSummary}
          />
        </aside>
        <div className="xl:order-1">
          <TripContentArea
            tripId={currentTripId}
            viewMode={view}
            listings={listings}
            isOwner={isOwner}
            userLikes={userLikes}
            userId={userId}
            tripContext={{
              numberOfPeople: trip.numberOfPeople ?? null,
              startDate: trip.startDate ? new Date(trip.startDate) : null,
              endDate: trip.endDate ? new Date(trip.endDate) : null,
            }}
          />
        </div>
      </div>
    </div>
  );
}