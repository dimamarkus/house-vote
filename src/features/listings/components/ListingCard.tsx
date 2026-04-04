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
import { ExternalLink, BedDouble, Bath, StickyNote, UserCircle, CalendarDays, CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';
import { ImageWithFallback } from '@/ui/core/ImageWithFallback';
import { cn } from '@/ui/utils/cn';
import { LISTING_STATUS, type ListingStatusValue } from '../constants/listing-status';

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
  showLink = false,
  baseUrl = '/listings',
  ...props
}: ListingCardProps) {
  const detailUrl = `${baseUrl}/${listing.id}`;
  const photoUrls = listing.photos?.map((photo) => photo.url) ?? [];
  const heroImageUrl = photoUrls[0] ?? listing.imageUrl ?? null;
  const photoCount = photoUrls.length;

  const getStatusVariant = (status: ListingStatusValue): BadgeProps['variant'] => {
    switch (status) {
      case LISTING_STATUS.POTENTIAL: return 'primary';
      case LISTING_STATUS.REJECTED: return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: ListingStatusValue) => {
    switch (status) {
      case LISTING_STATUS.POTENTIAL: return <CheckCircle className="h-4 w-4 mr-1" />;
      case LISTING_STATUS.REJECTED: return <XCircle className="h-4 w-4 mr-1" />;
      default: return null;
    }
  };

  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      {heroImageUrl && (
        <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
          <ImageWithFallback
            src={heroImageUrl}
            alt={listing.title || 'Listing image'}
            width={400}
            height={225}
            className="object-cover w-full h-full"
            FallbackIcon={ImageIcon}
            fallbackClassName="h-full w-full"
          />
          {photoCount > 1 ? (
            <Badge
              variant="secondary"
              className="absolute right-3 top-3 bg-background/85 text-foreground backdrop-blur"
            >
              {photoCount} photos
            </Badge>
          ) : null}
        </div>
      )}
      <CardHeader className={cn(heroImageUrl ? 'pt-4' : 'pt-6')}>
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
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
           <Badge variant={getStatusVariant(listing.status)} className="flex items-center">
               {getStatusIcon(listing.status)}
               {listing.status}
            </Badge>
           {listing.price && (
            <div className="font-semibold text-lg">
                ${listing.price.toLocaleString()}
            </div>
           )}
        </div>

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
        <CardFooter>
          {footerContent}
        </CardFooter>
      )}
    </Card>
  );
}