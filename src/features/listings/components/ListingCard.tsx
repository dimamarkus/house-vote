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
  showLink?: boolean;
  baseUrl?: string;
  roomBreakdown?: RoomBreakdown | null;
}

export function ListingCard({
  listing,
  className,
  footerContent,
  imageOverlayContent,
  showLink = false,
  baseUrl = '/listings',
  roomBreakdown,
  ...props
}: ListingCardProps) {
  const [face, setFace] = useState<'default' | 'rooms'>(
    roomBreakdown?.rooms?.length ? 'rooms' : 'default',
  );

  const detailUrl = `${baseUrl}/${listing.id}`;
  const storedPhotos = listing.photos?.map((photo) => photo.url) ?? [];
  const allPhotos = storedPhotos.length > 0 ? storedPhotos : listing.imageUrl ? [listing.imageUrl] : [];
  const hasPhotos = allPhotos.length > 0;
  const photoCount = allPhotos.length;
  const hasDefaultStatus = isVoteEligibleListingStatus(listing.status);
  const hasRooms = roomBreakdown && roomBreakdown.rooms.length > 0;
  const showingRooms = face === 'rooms' && hasRooms;
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
    />
  );
  const notesPreview =
    listing.notes && listing.notes.length > 160
      ? `${listing.notes.slice(0, 160).trimEnd()}...`
      : listing.notes;
  const hasLongDescription = Boolean(listing.notes && listing.notes.length > 160);
  const descriptionBlock = listing.notes ? (
    <Dialog>
      <div className="col-span-2 flex items-start gap-1">
        <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-muted-foreground break-words">{notesPreview}</p>
          {hasLongDescription ? (
            <DialogTrigger asChild>
              <button
                type="button"
                className="mt-1 text-xs font-medium text-muted-foreground/90 hover:text-foreground hover:underline"
              >
                Read Full Description
              </button>
            </DialogTrigger>
          ) : null}
        </div>
      </div>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Listing Description</DialogTitle>
          <DialogDescription>{listing.title}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{listing.notes}</p>
        </div>
      </DialogContent>
    </Dialog>
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
          overlayTopRight={
            photoCount > 1 ? (
              <Badge
                variant="secondary"
                className="bg-background/85 text-foreground backdrop-blur"
              >
                {photoCount} photos
              </Badge>
            ) : undefined
          }
        />
      ) : null}

      <CardHeader className={cn(hasPhotos ? 'pt-4' : 'pt-6')}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg flex-1 min-w-0">
            {showLink ? (
              <Link href={detailUrl} className="hover:underline">
                {listing.title}
              </Link>
            ) : (
              listing.title
            )}
          </CardTitle>
          {hasRooms && (
            <button
              type="button"
              onClick={() => setFace((f) => f === 'default' ? 'rooms' : 'default')}
              className={cn(
                "shrink-0 rounded-md p-1.5 transition-colors",
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
        {listing.address ? (
          <div className="text-sm text-muted-foreground">
            <p>{listing.address}</p>
          </div>
        ) : null}
        {(inlineStatusBadge || sourceBadge || listing.price) ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {inlineStatusBadge}
              {sourceBadge}
            </div>
            {listing.price ? (
              <div className="shrink-0 text-lg font-semibold tracking-tight">
                ${listing.price.toLocaleString()}
              </div>
            ) : null}
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground/70">
          Added {format(listing.createdAt, 'MMM d, yyyy')}
        </p>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-sm">
        {showingRooms ? (
          <div className="space-y-3">
            {(listing.bedroomCount != null ||
              bedCount != null ||
              listing.bathroomCount != null ||
              sleepsCount != null) && (
              <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                {listing.bedroomCount != null && (
                  <span className="flex items-center gap-1">
                    <DoorOpen className="h-4 w-4" />
                    {listing.bedroomCount === 1 ? '1 Room' : `${listing.bedroomCount} Rooms`}
                  </span>
                )}
                {bedCount != null && (
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-4 w-4" />
                    {bedCount === 1 ? '1 Bed' : `${bedCount} Beds`}
                  </span>
                )}
                {listing.bathroomCount != null && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {listing.bathroomCount === 1 ? '1 Bath' : `${listing.bathroomCount} Baths`}
                  </span>
                )}
                {sleepsCount != null && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {`Sleeps ${sleepsCount}`}
                  </span>
                )}
              </div>
            )}
            <RoomBreakdownGrid rooms={roomBreakdown.rooms} />
            {descriptionBlock}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {('bedroomCount' in listing ||
              bedCount != null ||
              'bathroomCount' in listing ||
              sleepsCount != null) ? (
              <div className="col-span-2 flex flex-wrap items-center gap-3 text-muted-foreground">
                {'bedroomCount' in listing && listing.bedroomCount != null ? (
                  <span className="flex items-center gap-1">
                    <DoorOpen className="h-4 w-4" />
                    {(listing.bedroomCount as number) === 1 ? '1 Room' : `${listing.bedroomCount as number} Rooms`}
                  </span>
                ) : null}
                {bedCount != null ? (
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-4 w-4" />
                    {bedCount === 1 ? '1 Bed' : `${bedCount} Beds`}
                  </span>
                ) : null}
                {'bathroomCount' in listing && listing.bathroomCount != null ? (
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {(listing.bathroomCount as number) === 1 ? '1 Bath' : `${listing.bathroomCount as number} Baths`}
                  </span>
                ) : null}
                {sleepsCount != null ? (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {`Sleeps ${sleepsCount}`}
                  </span>
                ) : null}
              </div>
            ) : null}

            {descriptionBlock}
          </div>
        )}
      </CardContent>

      {footerContent && (
        <CardFooter className="mt-auto">
          {footerContent}
        </CardFooter>
      )}
    </Card>
  );
}
