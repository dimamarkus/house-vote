'use client';

import dynamic from 'next/dynamic';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@turbodima/ui/shadcn/card';
import type { Listing } from 'db';
import { ListingStatus } from 'db';
import { ListingsTable } from '@/features/listings/tables/ListingsTable';
import { ListingCard } from '@/features/listings/components/ListingCard';
import { LikeButton } from '@/features/likes/components/LikeButton';
import { TripViewToggle } from './TripViewToggle';
import { cn } from '@turbodima/ui/utils/cn';

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
  status: ListingStatus;
}

interface TripContentAreaProps {
  viewMode?: 'table' | 'map' | 'card';
  listings: Listing[];
  userLikes: Record<string, boolean>;
  userId: string | null;
  tripId: string;
  className?: string;
}

export function TripContentArea({ viewMode = 'table', listings, userLikes, userId, tripId, className }: TripContentAreaProps) {
  // Construct base path for sorting links
  const basePath = `/trips/${tripId}`;

  // Filter listings based on status
  const potentialListings = listings.filter(l => l.status === ListingStatus.POTENTIAL);
  const rejectedListings = listings.filter(l => l.status === ListingStatus.REJECTED);

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
              currentUserLikes={userLikes}
              basePath={basePath}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}