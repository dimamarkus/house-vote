'use client';

import dynamic from 'next/dynamic';
import type { Listing, ListingPhoto } from 'db';
import type { ListingWithMedia } from '@/features/listings/types';
import type { ListingStatusValue } from '@/features/listings/constants/listing-status';

const ListingsMap = dynamic(
  () => import('@/features/listings/components/ListingsMap').then((mod) => mod.ListingsMap),
  { ssr: false, loading: () => <p>Loading map...</p> },
);

interface MapListing {
  id: string;
  title: string;
  address: string | null;
  url: string | null;
  price: number | null;
  bedroomCount: number | null;
  bedCount: number | null;
  bathroomCount: number | null;
  sourceDescription: string | null;
  notes: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
  addedById: string | null;
  addedByGuestId: string | null;
  addedByGuestName: string | null;
  tripId: string;
  status: ListingStatusValue;
  source: Listing['source'];
  listingType: Listing['listingType'];
  importMethod: Listing['importMethod'];
  importStatus: Listing['importStatus'];
  sourceExternalId: Listing['sourceExternalId'];
  importedAt: Listing['importedAt'];
  importError: Listing['importError'];
  rawImportPayload: Listing['rawImportPayload'];
  roomBreakdown: Listing['roomBreakdown'];
  nightlyPriceSource: Listing['nightlyPriceSource'];
  priceQuotedStartDate: Listing['priceQuotedStartDate'];
  priceQuotedEndDate: Listing['priceQuotedEndDate'];
  photos?: ListingPhoto[];
}

interface TripPotentialListingsMapProps {
  listings: ListingWithMedia[];
}

export function TripPotentialListingsMap({ listings }: TripPotentialListingsMapProps) {
  const listingsForMap: MapListing[] = listings.map((listing) => ({
    ...listing,
    latitude: listing.latitude,
    longitude: listing.longitude,
    addedById: listing.addedById || null,
    addedByGuestId: listing.addedByGuestId || null,
    addedByGuestName: listing.addedByGuestName || null,
  }));

  return <ListingsMap listings={listingsForMap} />;
}
