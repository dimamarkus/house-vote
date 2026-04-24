'use client';

import { ListingCard, type ListingCardProps } from '@/features/listings/components/ListingCard';
import { ListingActionsMenu } from '@/features/listings/components/ListingActionsMenu';
import type { ListingWithMedia } from '@/features/listings/types';
import { LikeButton } from '@/features/likes/components/LikeButton';
import type { TripPriceContext } from '@/features/listings/utils/priceBasis';

interface TripPotentialListingsCardsProps {
  listings: ListingWithMedia[];
  isOwner: boolean;
  userId: string | null;
  userLikes: Record<string, boolean>;
  tripContext?: TripPriceContext;
}

export function TripPotentialListingsCards({
  listings,
  isOwner,
  userId,
  userLikes,
  tripContext,
}: TripPotentialListingsCardsProps) {
  if (listings.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <p className="col-span-full text-center text-muted-foreground">No potential listings found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {listings.map((listing) => {
        const canEdit = !!userId;
        const canDelete = !!userId && (isOwner || userId === listing.addedById);
        const canRefreshFromSource = canDelete && Boolean(listing.url?.trim());

        return (
          <ListingCard
            key={listing.id}
            listing={listing}
            tripContext={tripContext}
            roomBreakdown={listing.roomBreakdown as ListingCardProps['roomBreakdown']}
            actionsMenu={
              <ListingActionsMenu
                canDelete={canDelete}
                canEdit={canEdit}
                canRefreshFromSource={canRefreshFromSource}
                canToggleStatus={Boolean(userId)}
                initialStateForEdit={listing}
                listingId={listing.id}
                listingStatus={listing.status}
                listingTitle={listing.title}
                listingUrl={listing.url}
                tripId={listing.tripId}
              />
            }
            footerContent={userId ? (
              <LikeButton
                listingId={listing.id}
                initialLiked={userLikes[listing.id] || false}
              />
            ) : null}
          />
        );
      })}
    </div>
  );
}
