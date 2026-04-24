'use client';

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import type { ListingWithMedia } from '@/features/listings/types';
import { ListingsTable } from '@/features/listings/tables/ListingsTable';
import { ListingCreateActions } from '@/features/listings/components/ListingCreateActions';
import { TripViewToggle } from './TripViewToggle';
import { TripPotentialListingsMap } from './TripPotentialListingsMap';
import { TripPotentialListingsCards } from './TripPotentialListingsCards';
import { cn } from '@/ui/utils/cn';
import { LISTING_STATUS } from '@/features/listings/constants/listing-status';
import type { TripPriceContext } from '@/features/listings/utils/priceBasis';

interface TripContentAreaProps {
  viewMode?: 'table' | 'map' | 'card';
  listings: ListingWithMedia[];
  isOwner: boolean;
  userLikes: Record<string, boolean>;
  userId: string | null;
  tripId: string;
  tripContext?: TripPriceContext;
  className?: string;
}

export function TripContentArea({
  viewMode = 'table',
  listings,
  isOwner,
  userLikes,
  userId,
  tripId,
  tripContext,
  className,
}: TripContentAreaProps) {
  const basePath = `/trips/${tripId}`;

  const potentialListings = listings.filter((l) => l.status === LISTING_STATUS.POTENTIAL);
  const rejectedListings = listings.filter((l) => l.status === LISTING_STATUS.REJECTED);

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle>Potential Housing Options</CardTitle>
              <CardDescription>
                Compare saved places and add new ones without leaving the shortlist.
              </CardDescription>
            </div>
            <CardAction>
              <TripViewToggle tripId={tripId} />
            </CardAction>
          </div>
          <ListingCreateActions tripId={tripId} />
        </CardHeader>
        <CardContent className="pt-0">
          {viewMode === 'table' && (
            <ListingsTable
              listings={potentialListings}
              currentUserId={userId || undefined}
              currentUserIsOwner={isOwner}
              currentUserLikes={userLikes}
              basePath={basePath}
              tripContext={tripContext}
            />
          )}
          {viewMode === 'map' && <TripPotentialListingsMap listings={potentialListings} />}
          {viewMode === 'card' && (
            <TripPotentialListingsCards
              listings={potentialListings}
              isOwner={isOwner}
              userId={userId}
              userLikes={userLikes}
              tripContext={tripContext}
            />
          )}
        </CardContent>
      </Card>

      {rejectedListings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rejected Options</CardTitle>
          </CardHeader>
          <CardContent>
            <ListingsTable
              listings={rejectedListings}
              currentUserId={userId || undefined}
              currentUserIsOwner={isOwner}
              currentUserLikes={userLikes}
              basePath={basePath}
              tripContext={tripContext}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
