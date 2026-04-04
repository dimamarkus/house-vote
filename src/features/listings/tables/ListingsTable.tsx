'use client';

import { format } from 'date-fns';
import { Eye, Edit, DollarSign, Bed, BedDouble, Bath, Image as ImageIcon } from 'lucide-react';
import type { Listing, User as PrismaUser, Trip, Like, ListingPhoto } from 'db';
import { GenericTable, ColumnDef } from '@/ui/core/GenericTable';
import { Button } from '@/ui/shadcn/button';
import { Badge } from '@/ui/shadcn/badge';
import { LinkButton } from '@/ui/core/LinkButton';
import { AirbnbLogotype, GlobeIcon, VrboLogotype } from '../../../components/TravelSourceIcons';
import { LikeButton } from '../../likes/components/LikeButton';
import { ListingStatusAction } from '../components/ListingStatusAction';
import { ImageWithFallback } from '@/ui/core/ImageWithFallback';
import { PhotoLightbox } from '@/ui/core/PhotoLightbox';
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

interface SourceBadgeProps {
  href?: string | null;
  title: string;
  className: string;
  children: React.ReactNode;
}

function SourceBadge({ href, title, className, children }: SourceBadgeProps) {
  const badge = (
    <Badge
      weight="hollow"
      className={className}
      title={href ? `Open original ${title} listing` : title}
    >
      {children}
    </Badge>
  );

  if (!href) {
    return badge;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Open original ${title} listing`}
      title={`Open original ${title} listing`}
    >
      {badge}
    </a>
  );
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
        const source = listing.source ?? 'MANUAL';
        const sourceUrl = typeof listing.url === 'string' && listing.url.length > 0 ? listing.url : null;

        if (source === 'AIRBNB') {
          return (
            <SourceBadge
              href={sourceUrl}
              title="Airbnb"
              className="border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700"
            >
              <AirbnbLogotype />
            </SourceBadge>
          );
        }

        if (source === 'VRBO') {
          return (
            <SourceBadge
              href={sourceUrl}
              title="Vrbo"
              className="border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700"
            >
              <VrboLogotype />
            </SourceBadge>
          );
        }

        if (source === 'UNKNOWN') {
          return (
            <SourceBadge
              href={sourceUrl}
              title="Imported"
              className="border-slate-200 bg-slate-50 px-2 text-slate-700"
            >
              <GlobeIcon className="h-3.5 w-3.5 shrink-0" />
            </SourceBadge>
          );
        }

        return (
          <Badge weight="hollow">Manual</Badge>
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