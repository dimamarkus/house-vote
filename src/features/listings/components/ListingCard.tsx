"use client";

import { useState, type HTMLAttributes } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  Image as ImageIcon,
  LayoutGrid,
} from 'lucide-react';
import type { Listing as PrismaListing, ListingPhoto } from 'db';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { PhotoCarousel } from '@/ui/core/PhotoCarousel';
import { RoomBreakdownGrid } from '@/ui/core/RoomBreakdownGrid';
import { cn } from '@/ui/utils/cn';
import { ListingSourceBadge } from './ListingSourceBadge';
import { ListingTypeBadge } from './ListingTypeBadge';
import { ListingStatusBadge } from './ListingStatusBadge';
import { ListingCardDescription } from './ListingCardDescription';
import { ListingCardMetrics } from './ListingCardMetrics';
import { isVoteEligibleListingStatus } from '../constants/listing-status';
import { extractBedCountFromRoomBreakdown, extractSleepsCount } from '../utils/extractSleepsCount';
import {
  computeListingPriceDisplay,
  type TripPriceContext,
} from '../utils/priceBasis';
import { usePriceBasis } from '@/features/trips/hooks/usePriceBasis';

type Listing = PrismaListing & {
  imageUrl?: string | null;
  photos?: ListingPhoto[];
};

interface RoomEntry {
  name: string;
  beds: string;
  imageUrl?: string | null;
}

interface RoomBreakdown {
  summary?: string | null;
  rooms: RoomEntry[];
}

export interface ListingCardProps extends HTMLAttributes<HTMLDivElement> {
  listing: Listing;
  className?: string;
  footerContent?: React.ReactNode;
  imageOverlayContent?: React.ReactNode;
  /**
   * Slot for an overflow / actions menu (e.g. a kebab dropdown).
   * Renders in the card's top-right corner. Stacks below the source badge
   * when the card has photos; otherwise sits inline with the header badges.
   */
  actionsMenu?: React.ReactNode;
  showLink?: boolean;
  baseUrl?: string;
  roomBreakdown?: RoomBreakdown | null;
  showAllMetadata?: boolean;
  /**
   * Trip-level context used to compute per-guest / total prices when the
   * user toggles away from per-night display. Omit to keep the card showing
   * nightly prices (e.g. surfaces outside a trip page).
   */
  tripContext?: TripPriceContext;
  /** Optional fixed unit label for surfaces whose stored price already matches that label. */
  priceUnitLabel?: string;
}

export function ListingCard({
  listing,
  className,
  footerContent,
  imageOverlayContent,
  actionsMenu,
  showLink = false,
  baseUrl = '/listings',
  roomBreakdown,
  showAllMetadata = false,
  tripContext,
  priceUnitLabel,
  ...props
}: ListingCardProps) {
  const [face, setFace] = useState<'default' | 'rooms'>(
    roomBreakdown?.rooms?.length ? 'rooms' : 'default',
  );
  const [priceBasis] = usePriceBasis();
  const priceDisplay = computeListingPriceDisplay(
    listing.price ?? null,
    priceBasis,
    tripContext,
  );

  const detailUrl = `${baseUrl}/${listing.id}`;
  const storedPhotos = listing.photos?.map((photo) => photo.url) ?? [];
  const allPhotos = storedPhotos.length > 0 ? storedPhotos : listing.imageUrl ? [listing.imageUrl] : [];
  const hasPhotos = allPhotos.length > 0;
  const hasDefaultStatus = isVoteEligibleListingStatus(listing.status);
  const hasRooms = roomBreakdown && roomBreakdown.rooms.length > 0;
  const showingRooms = hasRooms && (showAllMetadata || face === 'rooms');
  const sleepsCount = extractSleepsCount({ title: listing.title, roomBreakdown });
  const bedCount = listing.bedCount ?? extractBedCountFromRoomBreakdown(roomBreakdown);

  const statusBadge = !hasDefaultStatus ? (
    <ListingStatusBadge status={listing.status} />
  ) : null;

  const inlineStatusBadge = hasPhotos ? null : statusBadge;
  const imageStatusBadge = hasPhotos ? statusBadge : null;
  const sourceBadge = (
    <ListingSourceBadge
      source={listing.source}
      href={listing.url}
      showManual={false}
      badgeClassName="border-background/60 bg-background/90 shadow-sm backdrop-blur"
    />
  );
  const typeBadge = (
    <ListingTypeBadge
      type={listing.listingType}
      className="border-background/60 bg-background/90 shadow-sm backdrop-blur"
    />
  );
  const imageSourceBadge = hasPhotos ? sourceBadge : null;
  const inlineSourceBadge = hasPhotos ? null : sourceBadge;
  const overlayTopRight = hasPhotos && (imageSourceBadge || typeBadge || actionsMenu) ? (
    <div className="flex flex-col items-end gap-2">
      {imageSourceBadge}
      {typeBadge}
      {actionsMenu}
    </div>
  ) : undefined;

  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      {hasPhotos ? (
        <PhotoCarousel
          photos={allPhotos}
          alt={listing.title || 'Listing photos'}
          overlayTopLeft={
            imageOverlayContent || imageStatusBadge ? (
              <div className="flex flex-col items-start gap-2">
                {imageOverlayContent}
                {imageStatusBadge}
              </div>
            ) : undefined
          }
          overlayTopRight={overlayTopRight}
        />
      ) : null}

      <CardHeader className={cn(hasPhotos ? 'gap-4 pt-4' : 'gap-4 pt-6', 'pb-4')}>
        {(inlineStatusBadge || inlineSourceBadge || (!hasPhotos && typeBadge) || (!hasPhotos && actionsMenu)) ? (
          <div className="flex flex-wrap items-center gap-2">
            {inlineStatusBadge}
            {inlineSourceBadge}
            {!hasPhotos ? typeBadge : null}
            {!hasPhotos && actionsMenu ? (
              <div className="ml-auto">{actionsMenu}</div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <CardTitle className="line-clamp-2 text-lg leading-tight">
              {showLink ? (
                <Link href={detailUrl} className="hover:underline" title={listing.title}>
                  {listing.title}
                </Link>
              ) : (
                <span title={listing.title}>{listing.title}</span>
              )}
            </CardTitle>
            {listing.address ? (
              <p className="truncate text-sm text-muted-foreground" title={listing.address}>
                {listing.address}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {priceDisplay.amount ? (
              <div className="flex flex-col items-end">
                <div className="rounded-md bg-primary/10 px-2.5 py-1 text-lg font-bold tracking-tight text-primary">
                  ${priceDisplay.amount}
                </div>
                <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {priceUnitLabel ?? priceDisplay.unitLabel}
                </span>
              </div>
            ) : null}
            {hasRooms && !showAllMetadata && (
              <button
                type="button"
                onClick={() => setFace((f) => f === 'default' ? 'rooms' : 'default')}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  showingRooms ? "bg-muted text-foreground" : "text-muted-foreground",
                )}
                aria-label={showingRooms ? "Show photos" : "Show rooms & beds"}
                title={showingRooms ? "Show photos" : "Show rooms & beds"}
              >
                {showingRooms ? <ImageIcon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        <ListingCardMetrics
          listingType={listing.listingType}
          bedroomCount={listing.bedroomCount}
          bedCount={bedCount}
          bathroomCount={listing.bathroomCount}
          sleepsCount={sleepsCount}
        />
      </CardHeader>

      <CardContent className="flex flex-1 flex-col text-sm">
        <div className="space-y-4">
          {showingRooms && hasRooms && (
            <RoomBreakdownGrid rooms={roomBreakdown.rooms} />
          )}
          <ListingCardDescription
            listingTitle={listing.title}
            sourceDescription={listing.sourceDescription}
            notes={listing.notes}
          />
        </div>

        <div className="mt-auto pt-6">
          <p className="text-[11px] text-muted-foreground/50">
            Added {format(listing.createdAt, 'MMM d, yyyy')}
          </p>
        </div>
      </CardContent>

      {footerContent && (
        <CardFooter className="border-t border-border/50 pt-4">
          {footerContent}
        </CardFooter>
      )}
    </Card>
  );
}
