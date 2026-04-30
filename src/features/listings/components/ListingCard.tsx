"use client";

import { useState, type HTMLAttributes } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { setListingPrimaryPhoto } from '../actions/setListingPrimaryPhoto';
import { isVoteEligibleListingStatus } from '../constants/listing-status';
import { extractBedCountFromRoomBreakdown, extractSleepsCount } from '../utils/extractSleepsCount';
import {
  computeListingPriceDisplay,
  type TripPriceContext,
} from '../utils/priceBasis';
import { usePriceBasis } from '@/features/trips/hooks/usePriceBasis';
import { generateTravelListingUrl } from '@/features/trips/utils/travelLinks';
import type { TripTravelContext } from '@/features/trips/utils/tripTravelContext';

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
  showDescription?: boolean;
  /**
   * Trip-level context used to compute per-guest / total prices when the
   * user toggles away from per-night display. Omit to keep the card showing
   * nightly prices (e.g. surfaces outside a trip page).
   */
  tripContext?: TripPriceContext;
  /** Trip-level dates + guest count used to enrich outbound travel-site links. */
  travelLinkContext?: TripTravelContext;
  /** Optional fixed unit label for surfaces whose stored price already matches that label. */
  priceUnitLabel?: string;
  allowPrimaryPhotoSelection?: boolean;
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
  showDescription = true,
  tripContext,
  travelLinkContext,
  priceUnitLabel,
  allowPrimaryPhotoSelection = false,
  ...props
}: ListingCardProps) {
  const router = useRouter();
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
  const effectiveTravelLinkContext = travelLinkContext ?? tripContext;
  const originalListingUrl = generateTravelListingUrl({
    url: listing.url,
    source: listing.source,
    startDate: effectiveTravelLinkContext?.startDate,
    endDate: effectiveTravelLinkContext?.endDate,
    numberOfPeople: effectiveTravelLinkContext?.numberOfPeople,
    adultCount: effectiveTravelLinkContext?.adultCount,
    childCount: effectiveTravelLinkContext?.childCount,
  });
  const storedPhotos = [...(listing.photos ?? [])]
    .sort((left, right) => left.position - right.position)
    .map((photo) => photo.url);
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
      href={originalListingUrl}
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

  async function handleSetPrimaryPhoto(photoUrl: string) {
    const result = await setListingPrimaryPhoto({
      listingId: listing.id,
      photoUrl,
    });

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to set key photo.');
      return;
    }

    router.refresh();
    toast.success('Key photo updated.');
  }

  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      {hasPhotos ? (
        <PhotoCarousel
          photos={allPhotos}
          alt={listing.title || 'Listing photos'}
          primaryPhotoUrl={storedPhotos[0] ?? listing.imageUrl ?? null}
          onSetPrimaryPhoto={allowPrimaryPhotoSelection && storedPhotos.length > 1 ? handleSetPrimaryPhoto : undefined}
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
              {originalListingUrl ? (
                <a
                  href={originalListingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  title={listing.title}
                >
                  {listing.title}
                </a>
              ) : showLink ? (
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
          {showDescription ? (
            <ListingCardDescription
              listingTitle={listing.title}
              sourceDescription={listing.sourceDescription}
              notes={listing.notes}
            />
          ) : null}
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
