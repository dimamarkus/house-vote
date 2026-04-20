"use client";

import { useState, type HTMLAttributes } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/ui/shadcn/card';
import type { Listing as PrismaListing, ListingPhoto } from 'db';

type Listing = PrismaListing & {
  imageUrl?: string | null;
  photos?: ListingPhoto[];
};

import Link from 'next/link';
import { Badge, BadgeProps } from '@/ui/shadcn/badge';
import {
  BedDouble,
  Bath,
  DoorOpen,
  StickyNote,
  XCircle,
  LayoutGrid,
  Image as ImageIcon,
  Users,
} from 'lucide-react';
import { PhotoCarousel } from '@/ui/core/PhotoCarousel';
import { RoomBreakdownGrid } from '@/ui/core/RoomBreakdownGrid';
import { cn } from '@/ui/utils/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/shadcn/dialog';
import { ListingSourceBadge } from './ListingSourceBadge';
import {
  formatListingStatusLabel,
  isVoteEligibleListingStatus,
  LISTING_STATUS,
  type ListingStatusValue,
} from '../constants/listing-status';
import { extractBedCountFromRoomBreakdown, extractSleepsCount } from '../utils/extractSleepsCount';

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
  ...props
}: ListingCardProps) {
  const [face, setFace] = useState<'default' | 'rooms'>(
    roomBreakdown?.rooms?.length ? 'rooms' : 'default',
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

  const getStatusVariant = (status: ListingStatusValue): BadgeProps['variant'] => {
    switch (status) {
      case LISTING_STATUS.REJECTED: return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: ListingStatusValue) => {
    switch (status) {
      case LISTING_STATUS.REJECTED: return <XCircle className="h-4 w-4 mr-1" />;
      default: return null;
    }
  };

  const statusBadge = !hasDefaultStatus ? (
    <Badge variant={getStatusVariant(listing.status)} className="flex items-center shadow-sm">
      {getStatusIcon(listing.status)}
      {formatListingStatusLabel(listing.status)}
    </Badge>
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
  const imageSourceBadge = hasPhotos ? sourceBadge : null;
  const inlineSourceBadge = hasPhotos ? null : sourceBadge;
  const overlayTopRight = hasPhotos && (imageSourceBadge || actionsMenu) ? (
    <div className="flex flex-col items-end gap-2">
      {imageSourceBadge}
      {actionsMenu}
    </div>
  ) : undefined;
  const trimmedSourceDescription = listing.sourceDescription?.trim() ?? '';
  const trimmedNotes = listing.notes?.trim() ?? '';
  const detailText = trimmedSourceDescription || trimmedNotes || null;
  const detailLabel = trimmedSourceDescription ? 'Description' : 'Notes';
  const detailPreview =
    detailText && detailText.length > 160
      ? `${detailText.slice(0, 160).trimEnd()}...`
      : detailText;
  const hasLongDescription = Boolean(detailText && detailText.length > 160);
  const descriptionBlock = detailText ? (
    <Dialog>
      <div className="col-span-2 flex items-start gap-1">
        <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-muted-foreground wrap-break-word">{detailPreview}</p>
          {hasLongDescription ? (
            <DialogTrigger asChild>
              <button
                type="button"
                className="mt-1 text-xs font-medium text-muted-foreground/90 hover:text-foreground hover:underline"
              >
                {`Read Full ${detailLabel}`}
              </button>
            </DialogTrigger>
          ) : null}
        </div>
      </div>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{`Listing ${detailLabel}`}</DialogTitle>
          <DialogDescription>{listing.title}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{detailText}</p>
        </div>
      </DialogContent>
    </Dialog>
  ) : null;
  const summaryMetrics = (listing.bedroomCount != null ||
    bedCount != null ||
    listing.bathroomCount != null ||
    sleepsCount != null) ? (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {listing.bedroomCount != null && (
        <span className="flex items-center gap-1.5 rounded-md bg-muted/80 px-2 py-1 text-xs font-medium text-foreground">
          <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
          {listing.bedroomCount === 1 ? '1 Room' : `${listing.bedroomCount} Rooms`}
        </span>
      )}
      {bedCount != null && (
        <span className="flex items-center gap-1.5 rounded-md bg-muted/80 px-2 py-1 text-xs font-medium text-foreground">
          <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
          {bedCount === 1 ? '1 Bed' : `${bedCount} Beds`}
        </span>
      )}
      {listing.bathroomCount != null && (
        <span className="flex items-center gap-1.5 rounded-md bg-muted/80 px-2 py-1 text-xs font-medium text-foreground">
          <Bath className="h-3.5 w-3.5 text-muted-foreground" />
          {listing.bathroomCount === 1 ? '1 Bath' : `${listing.bathroomCount} Baths`}
        </span>
      )}
      {sleepsCount != null && (
        <span className="flex items-center gap-1.5 rounded-md bg-muted/80 px-2 py-1 text-xs font-medium text-foreground">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {`Sleeps ${sleepsCount}`}
        </span>
      )}
    </div>
  ) : null;

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
        {(inlineStatusBadge || inlineSourceBadge || (!hasPhotos && actionsMenu)) ? (
          <div className="flex flex-wrap items-center gap-2">
            {inlineStatusBadge}
            {inlineSourceBadge}
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
            {listing.price ? (
              <div className="rounded-md bg-primary/10 px-2.5 py-1 text-lg font-bold tracking-tight text-primary">
                ${listing.price.toLocaleString()}
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

        {summaryMetrics}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col text-sm">
        <div className="space-y-4">
          {showingRooms && hasRooms && (
            <RoomBreakdownGrid rooms={roomBreakdown.rooms} />
          )}
          {descriptionBlock}
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
