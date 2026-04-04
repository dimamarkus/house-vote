'use client';

import { format } from 'date-fns';
import { Eye, Edit, DollarSign, Bed, BedDouble, Bath, Image as ImageIcon } from 'lucide-react';
import type { Listing, User as PrismaUser, Trip, Like } from 'db';
import { GenericTable, ColumnDef } from '@turbodima/ui/core/GenericTable';
import { Button } from '@turbodima/ui/shadcn/button';
import { Badge } from '@turbodima/ui/shadcn/badge';
import { LinkButton } from '@turbodima/ui/core/LinkButton';
import { LikeButton } from '../../likes/components/LikeButton';
import { ListingStatusAction } from '../components/ListingStatusAction';
import { ImageWithFallback } from '@turbodima/ui/core/ImageWithFallback';
import { ListingFormSheet } from '../forms/ListingFormSheet';
import { DeleteListingActionButton } from '../components/DeleteListingActionButton';

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
        return (
          <div className="w-16 h-10 overflow-hidden rounded bg-muted flex items-center justify-center">
            <ImageWithFallback
              src={listing.imageUrl ?? null}
              alt={listing.title || 'Listing thumbnail'}
              width={64}
              height={40}
              className="object-cover w-full h-full"
              FallbackIcon={ImageIcon}
              fallbackClassName="h-full w-full p-1"
            />
          </div>
        );
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
        const sourceLabel = listing.source === 'UNKNOWN' ? 'Imported' : listing.source ?? 'MANUAL';
        const importStatusLabel =
          listing.importStatus && listing.importStatus !== 'NOT_IMPORTED'
            ? listing.importStatus.toLowerCase()
            : null;

        return (
          <div className="flex flex-col items-start gap-1">
            <Badge weight="hollow">{sourceLabel}</Badge>
            {importStatusLabel ? (
              <span className="text-xs text-muted-foreground">{importStatusLabel}</span>
            ) : null}
          </div>
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
      header: "Status",
      accessorKey: "status",
      sortable: true,
      cell: (listing) => {
        return (
          <div className="flex items-center gap-2">
            <Badge variant={listing.status === 'REJECTED' ? 'destructive' : 'secondary'}>
              {listing.status}
            </Badge>
            {currentUserId && (
              <ListingStatusAction
                listingId={listing.id}
                currentStatus={listing.status}
                size="sm"
              />
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
        const canEdit = !!currentUserId && currentUserId === listing.addedById;
        const canDelete = !!currentUserId && (currentUserIsOwner || currentUserId === listing.addedById);
        const canViewSource = typeof listing.url === "string" && listing.url.length > 0;

        return (
          <div className="flex items-center justify-end gap-1 pr-4">
            {canViewSource ? (
              <LinkButton
                href={listing.url ?? '#'}
                target="_blank"
                size="icon"
                weight="ghost"
                title="View Original Listing"
                className="size-8 p-0"
              >
                <span className="sr-only">View original listing</span>
                <Eye className="h-4 w-4" />
              </LinkButton>
            ) : (
              <Button
                size="icon"
                weight="ghost"
                title="No source URL available"
                className="size-8 p-0"
                disabled
              >
                <span className="sr-only">No source URL available</span>
                <Eye className="h-4 w-4" />
              </Button>
            )}

            {canEdit && (
              <ListingFormSheet listingId={listing.id} tripId={listing.tripId} initialState={listing}>
                <Button size="icon" weight="ghost" title="Edit Listing" className="size-8 p-0">
                  <span className="sr-only">Edit</span>
                  <Edit className="h-4 w-4" />
                </Button>
              </ListingFormSheet>
            )}

            {canDelete && (
              <div className="text-destructive hover:text-destructive hover:bg-destructive/10 size-8 p-0 flex items-center justify-center">
                <DeleteListingActionButton
                  listingId={listing.id}
                  listingTitle={listing.title}
                  buttonSize="sm"
                  buttonWeight="ghost"
                />
              </div>
            )}
          </div>
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