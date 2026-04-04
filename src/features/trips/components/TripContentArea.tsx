'use client';

import dynamic from 'next/dynamic';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@turbodima/ui/shadcn/card';
import type { Listing } from 'db';
import { ListingsTable } from '@/features/listings/tables/ListingsTable';
import { ListingCard } from '@/features/listings/components/ListingCard';
import { DeleteListingActionButton } from '@/features/listings/components/DeleteListingActionButton';
import { LikeButton } from '@/features/likes/components/LikeButton';
import { TripViewToggle } from './TripViewToggle';
import { cn } from '@turbodima/ui/utils/cn';
import { LISTING_STATUS, type ListingStatusValue } from '@/features/listings/constants/listing-status';

// Dynamically import the map component, disabling SSR
const ListingsMap = dynamic(
  () => import('@/features/listings/components/ListingsMap').then((mod) => mod.ListingsMap),
  { ssr: false, loading: () => <p>Loading map...</p> }
);

// Type for the map component's listings - ensure lat/lng are number | null
interface MapListing {
  id: string;
  title: string;
  address: string | null;
  url: string | null;
  price: number | null;
  bedroomCount: number | null;
  bedCount: number | null;
  bathroomCount: number | null;
  notes: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
  addedById: string | null;
  addedByGuestName: string | null;
  tripId: string;
  status: ListingStatusValue;
  source: Listing['source'];
  importMethod: Listing['importMethod'];
  importStatus: Listing['importStatus'];
  sourceExternalId: Listing['sourceExternalId'];
  importedAt: Listing['importedAt'];
  importError: Listing['importError'];
  rawImportPayload: Listing['rawImportPayload'];
}

interface TripContentAreaProps {
  viewMode?: 'table' | 'map' | 'card';
  listings: Listing[];
  isOwner: boolean;
  userLikes: Record<string, boolean>;
  userId: string | null;
  tripId: string;
  className?: string;
}

export function TripContentArea({
  viewMode = 'table',
  listings,
  isOwner,
  userLikes,
  userId,
  tripId,
  className,
}: TripContentAreaProps) {
  // Construct base path for sorting links
  const basePath = `/trips/${tripId}`;

  // Filter listings based on status
  const potentialListings = listings.filter(l => l.status === LISTING_STATUS.POTENTIAL);
  const rejectedListings = listings.filter(l => l.status === LISTING_STATUS.REJECTED);

  // Convert Potential Listings for the map
  const listingsForMap: MapListing[] = viewMode === 'map' ? potentialListings.map(listing => ({
    ...listing,
    latitude: listing.latitude,
    longitude: listing.longitude,
    addedById: listing.addedById || null,
    addedByGuestName: listing.addedByGuestName || null,
  })) : [];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Card for Potential Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Potential Housing Options</CardTitle>
          <CardAction>
            <TripViewToggle tripId={tripId} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' && (
            <ListingsTable
              listings={potentialListings}
              currentUserId={userId || undefined}
              currentUserIsOwner={isOwner}
              currentUserLikes={userLikes}
              basePath={basePath}
            />
          )}
          {viewMode === 'map' && (
            <ListingsMap listings={listingsForMap} />
          )}
          {viewMode === 'card' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {potentialListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  footerContent={
                    <div className="flex w-full justify-end gap-2">
                      {userId && (
                        <LikeButton
                          listingId={listing.id}
                          initialLiked={userLikes[listing.id] || false}
                        />
                      )}
                      {userId && (isOwner || userId === listing.addedById) && (
                        <DeleteListingActionButton
                          listingId={listing.id}
                          listingTitle={listing.title}
                          buttonText="Delete"
                          buttonVariant="destructive"
                          buttonWeight="hollow"
                        />
                      )}
                    </div>
                  }
                />
              ))}
              {potentialListings.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground">No potential listings found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card for Rejected Listings (only shown if there are any) */}
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
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}