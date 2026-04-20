'use client';

import { format } from 'date-fns';
import { DollarSign, Bed, BedDouble, Bath, Image as ImageIcon } from 'lucide-react';
import type { Listing, User as PrismaUser, Trip, Like, ListingPhoto } from 'db';
import { GenericTable, ColumnDef } from '@/ui/core/GenericTable';
import { LikeButton } from '../../likes/components/LikeButton';
import { ImageWithFallback } from '@/ui/core/ImageWithFallback';
import { PhotoLightbox } from '@/ui/core/PhotoLightbox';
import { ListingSourceBadge } from '../components/ListingSourceBadge';
import { ListingActionsMenu } from '../components/ListingActionsMenu';

// Requires getListings action to include: addedBy, likes: { select: { id: true }}
// to satisfy these types fully.

type ListingWithRelations = Listing & {
  title: string;
  address?: string | null;
  addedBy?: Pick<PrismaUser, 'id'> | null;
  trip?: Pick<Trip, 'id'> | null;
  likes?: Pick<Like, 'id'>[];
  bedroomCount?: number | null;
  bedCount?: number | null;
  bathroomCount?: number | null;
  imageUrl?: string | null;
  photos?: ListingPhoto[];
  source?: 'MANUAL' | 'AIRBNB' | 'VRBO' | 'UNKNOWN';
  importStatus?: 'NOT_IMPORTED' | 'PARTIAL' | 'COMPLETE' | 'FAILED';
};

interface ListingsTableProps {
  listings: ListingWithRelations[];
  currentUserId?: string;
  currentUserIsOwner?: boolean;
  currentUserLikes?: Record<string, boolean>;
  basePath?: string;
}

export function ListingsTable({
  listings,
  currentUserId,
  currentUserIsOwner = false,
  currentUserLikes = {},
  basePath,
}: ListingsTableProps) {

  // Columns expect cell function to receive the item directly
  const columns: ColumnDef<ListingWithRelations>[] = [
    {
      header: "Image",
      cell: (listing) => {
        const photoUrls = listing.photos?.map((p) => p.url) ?? [];
        const photoCount = photoUrls.length;
        const heroImageUrl = photoUrls[0] ?? listing.imageUrl ?? null;

        const thumb = (
          <div className="relative w-16 h-10 overflow-hidden rounded bg-muted flex items-center justify-center">
            <ImageWithFallback
              src={heroImageUrl}
              alt={listing.title || 'Listing thumbnail'}
              width={64}
              height={40}
              className="object-cover w-full h-full"
              FallbackIcon={ImageIcon}
              fallbackClassName="h-full w-full p-1"
            />
            {photoCount > 1 ? (
              <span className="absolute bottom-1 right-1 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium leading-none backdrop-blur">
                {photoCount}
              </span>
            ) : null}
          </div>
        );

        if (photoUrls.length > 0) {
          return (
            <PhotoLightbox photos={photoUrls} alt={listing.title || 'Listing photos'}>
              <div className="cursor-pointer">{thumb}</div>
            </PhotoLightbox>
          );
        }

        return thumb;
      }
    },
    {
      header: "Title",
      accessorKey: "title",
      sortable: true,
      cell: (listing) => {
        return (
          <div className="font-medium max-w-sm truncate" title={listing.title}>
            {listing.url ? (
              <a href={listing.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {listing.title}
              </a>
            ) : (
              listing.title
            )}
          </div>
        );
      }
    },
    {
      header: "Source",
      accessorKey: "source",
      cell: (listing) => {
        return (
          <ListingSourceBadge
            source={listing.source}
            href={listing.url}
          />
        );
      }
    },
    {
      header: "Price",
      accessorKey: "price",
      sortable: true,
      cell: (listing) => {
        return (
          <div className="flex items-center gap-1">
            {listing.price ? (
              <>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{listing.price.toLocaleString()}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">N/A</span>
            )}
          </div>
        );
      }
    },
    {
      header: "Beds",
      accessorKey: "bedroomCount",
      sortable: true,
      cell: (listing) => {
        return (
          <div className="flex items-center justify-center gap-1">
            {listing.bedroomCount !== null && listing.bedroomCount !== undefined ? (
              <>
                <BedDouble className="h-4 w-4 text-muted-foreground" />
                <span>{listing.bedroomCount}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">N/A</span>
            )}
          </div>
        );
      }
    },
    {
      header: "Bed Count",
      accessorKey: "bedCount",
      sortable: true,
      cell: (listing) => {
        return (
          <div className="flex items-center justify-center gap-1">
            {listing.bedCount !== null && listing.bedCount !== undefined ? (
              <>
                <Bed className="h-4 w-4 text-muted-foreground" />
                <span>{listing.bedCount}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">N/A</span>
            )}
          </div>
        );
      }
    },
    {
      header: "Baths",
      accessorKey: "bathroomCount",
      sortable: true,
      cell: (listing) => {
        return (
          <div className="flex items-center justify-center gap-1">
            {listing.bathroomCount !== null && listing.bathroomCount !== undefined ? (
              <>
                <Bath className="h-4 w-4 text-muted-foreground" />
                <span>{listing.bathroomCount}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">N/A</span>
            )}
          </div>
        );
      }
    },
    {
      header: "Likes",
      accessorKey: "likes",
      cell: (listing) => {
        const likeCount = listing.likes?.length ?? 0;
        const hasLiked = currentUserLikes[listing.id] ?? false;

        return (
          <div className="flex items-center justify-center">
            <LikeButton
              listingId={listing.id}
              initialCount={likeCount}
              initialLiked={hasLiked}
              size="sm"
            />
          </div>
        );
      }
    },
    // {
    //   header: "Added By",
    //   accessorKey: "addedById",
    //   cell: (listing) => {
    //     return (
    //       <div className="flex items-center gap-1">
    //         <User className="h-4 w-4 text-muted-foreground" />
    //         <span>{listing.addedById ? listing.addedById.substring(0, 8) + '...' : 'Guest'}</span>
    //       </div>
    //     );
    //   }
    // },
    {
      header: "Added On",
      accessorKey: "createdAt",
      sortable: true,
      cell: (listing) => {
        const formattedDate = format(listing.createdAt, 'MMM d, yyyy');
        return formattedDate;
      }
    },
    {
      header: "Actions",
      cell: (listing) => {
        const canEdit = !!currentUserId;
        const canDelete = !!currentUserId && (currentUserIsOwner || currentUserId === listing.addedById);
        const canRefreshFromSource = canDelete && Boolean(listing.url?.trim());

        return (
          <ListingActionsMenu
            canDelete={canDelete}
            canEdit={canEdit}
            canRefreshFromSource={canRefreshFromSource}
            canToggleStatus={Boolean(currentUserId)}
            initialStateForEdit={listing}
            listingId={listing.id}
            listingStatus={listing.status}
            listingTitle={listing.title}
            listingUrl={listing.url}
            tripId={listing.tripId}
          />
        );
      }
    }
  ];

  return (
    <GenericTable<ListingWithRelations>
      data={listings}
      columns={columns}
      rowKeyField="id"
      basePath={basePath}
      emptyStateProps={{
        title: "No listings found",
        description: "Add house listings to start comparing, or adjust your filters.",
        icon: "Home"
      }}
    />
  );
}