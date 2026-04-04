import { HTMLAttributes } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/ui/shadcn/card';
import type { Listing as PrismaListing, ListingPhoto } from 'db';
type Listing = PrismaListing & {
  imageUrl?: string | null;
  photos?: ListingPhoto[];
};

import Link from 'next/link';
import { Badge, BadgeProps } from '@/ui/shadcn/badge';
import { ExternalLink, BedDouble, Bath, StickyNote, UserCircle, CalendarDays, XCircle } from 'lucide-react';
import { PhotoCarousel } from '@/ui/core/PhotoCarousel';
import { cn } from '@/ui/utils/cn';
import {
  formatListingStatusLabel,
  isVoteEligibleListingStatus,
  LISTING_STATUS,
  type ListingStatusValue,
} from '../constants/listing-status';

/**
 * Props for the ListingCard component
 */
export interface ListingCardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The listing data to display. Should match the Prisma Listing model.
   */
  listing: Listing;
  /**
   * Additional className
   */
  className?: string;
  /**
   * Optional footer content
   */
  footerContent?: React.ReactNode;
  /**
   * Optional content rendered over the top-left of the hero image.
   */
  imageOverlayContent?: React.ReactNode;
  /**
   * Show a link to the detail page? Uses listing id.
   */
  showLink?: boolean;
  /**
   * Base URL for links. Should not include trailing slash.
   */
  baseUrl?: string;
}

/**
 * ListingCard component - A read-only view of Listing data
 * Displays key information about a listing in a card format.
 *
 * @component
 * @type {UI}
 */
export function ListingCard({
  listing,
  className,
  footerContent,
  imageOverlayContent,
  showLink = false,
  baseUrl = '/listings',
  ...props
}: ListingCardProps) {
  const detailUrl = `${baseUrl}/${listing.id}`;
  const storedPhotos = listing.photos?.map((photo) => photo.url) ?? [];
  const allPhotos = storedPhotos.length > 0 ? storedPhotos : listing.imageUrl ? [listing.imageUrl] : [];
  const hasPhotos = allPhotos.length > 0;
  const photoCount = allPhotos.length;
  const hasDefaultStatus = isVoteEligibleListingStatus(listing.status);

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

  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      {hasPhotos && (
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
      )}
      <CardHeader className={cn(hasPhotos ? 'pt-4' : 'pt-6')}>
        <CardTitle className="text-lg">
          {showLink ? (
            <Link href={detailUrl} className="hover:underline">
              {listing.title}
            </Link>
          ) : (
            listing.title
          )}
        </CardTitle>
        {(listing.address || listing.url) && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {listing.address ? <p>{listing.address}</p> : null}
            {listing.url ? (
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View Original Listing
              </a>
            ) : null}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-3 text-sm">
        {inlineStatusBadge || listing.price ? (
          <div className={cn("flex items-center", inlineStatusBadge ? "justify-between" : "justify-end")}>
            {inlineStatusBadge}
            {listing.price ? (
              <div className="font-semibold text-lg">
                ${listing.price.toLocaleString()}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
           {/* Bed/Bath Info - Use ternary and explicit cast */}
           {('bedroomCount' in listing || 'bedCount' in listing || 'bathroomCount' in listing) ? (
             <div className="col-span-2 flex items-center gap-3 text-muted-foreground">
               {'bedroomCount' in listing && listing.bedroomCount != null ? <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" /> {listing.bedroomCount as number} bd</span> : null}
               {'bedCount' in listing && listing.bedCount != null ? <span className="flex items-center gap-1"><BedDouble className="h-4 w-4" /> {listing.bedCount as number} bed</span> : null}
               {'bathroomCount' in listing && listing.bathroomCount != null ? <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {listing.bathroomCount as number} ba</span> : null}
             </div>
           ) : null}

           {/* Notes */}
           {listing.notes && (
             <div className="col-span-2 flex items-start gap-1">
               <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
               <p className="text-muted-foreground break-words">{listing.notes}</p>
             </div>
           )}

           {/* Added By */}
           {(listing.addedById || listing.addedByGuestName) && (
              <div className="col-span-2 flex items-center gap-1">
                 <UserCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                 <span className="text-muted-foreground">
                   Added by: {listing.addedByGuestName || `User ID: ${listing.addedById?.substring(0, 8)}...`}
                 </span>
              </div>
           )}

            {/* Created At */}
           <div className="col-span-2 flex items-center gap-1">
               <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                   Added: {format(listing.createdAt, 'MMM d, yyyy')}
                </span>
            </div>
        </div>

      </CardContent>
      {footerContent && (
        <CardFooter className="mt-auto">
          {footerContent}
        </CardFooter>
      )}
    </Card>
  );
}