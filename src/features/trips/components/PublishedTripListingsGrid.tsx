'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { castPublishedTripVote } from '@/features/trips/actions/publishedTripActions';
import {
  LISTING_STATUS,
  formatListingStatusLabel,
  isVoteEligibleListingStatus,
} from '@/features/listings/constants/listing-status';
import { PublishedListingActionsMenu } from '@/features/trips/components/PublishedListingActionsMenu';
import { PublishedListingCardFooter } from '@/features/trips/components/PublishedListingCardFooter';
import { usePublishedTripGuest } from '@/features/trips/components/PublishedTripGuestContext';
import { usePublishedListingCardView } from '@/features/trips/hooks/usePublishedListingCardView';
import type { PublishedTripListingRecord } from '@/features/trips/publishedDb';
import { ListingCard, type ListingCardProps } from '@/features/listings/components/ListingCard';
import { ListingVisibilityToggleCard } from '@/features/listings/components/ListingVisibilityToggleCard';
import { createTripTravelContext } from '@/features/trips/utils/tripTravelContext';
import { Badge } from '@/ui/shadcn/badge';
import { Card, CardContent } from '@/ui/shadcn/card';
import { cn } from '@/ui/utils/cn';

interface PublishedTripListingsGridProps {
  listings: PublishedTripListingRecord[];
}

export function PublishedTripListingsGrid({ listings }: PublishedTripListingsGridProps) {
  const { token, share, activeGuest } = usePublishedTripGuest();
  const router = useRouter();
  const [cardView] = usePublishedListingCardView();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [hideRejectedListings, setHideRejectedListings] = useState(true);

  const sortedListings = useMemo(() => {
    return [...listings].sort((left, right) => {
      const leftIsVoteEligible = isVoteEligibleListingStatus(left.status);
      const rightIsVoteEligible = isVoteEligibleListingStatus(right.status);

      if (leftIsVoteEligible !== rightIsVoteEligible) {
        return leftIsVoteEligible ? -1 : 1;
      }

      if (right.votes.length !== left.votes.length) {
        return right.votes.length - left.votes.length;
      }

      return left.title.localeCompare(right.title);
    });
  }, [listings]);
  const rejectedListings = sortedListings.filter((listing) => (
    listing.status === LISTING_STATUS.REJECTED
  ));
  const rejectedListingCount = rejectedListings.length;
  const visibleListings = hideRejectedListings
    ? sortedListings.filter((listing) => listing.status !== LISTING_STATUS.REJECTED)
    : sortedListings;
  const rejectedPreviewImageUrls = rejectedListings
    .map((listing) => listing.photos[0]?.url ?? listing.imageUrl)
    .filter((imageUrl): imageUrl is string => Boolean(imageUrl))
    .slice(0, 3);

  const currentWinnerListingId = useMemo(() => {
    return sortedListings.find((listing) => (
      isVoteEligibleListingStatus(listing.status) && listing.votes.length > 0
    ))?.id ?? null;
  }, [sortedListings]);

  const currentVoteListingId = activeGuest.votes[0]?.listingId ?? null;
  const travelLinkContext = useMemo(() => createTripTravelContext({
    numberOfPeople: share.trip.numberOfPeople ?? null,
    adultCount: share.trip.adultCount ?? null,
    childCount: share.trip.childCount ?? null,
    startDate: share.trip.startDate,
    endDate: share.trip.endDate,
  }), [
    share.trip.adultCount,
    share.trip.childCount,
    share.trip.endDate,
    share.trip.numberOfPeople,
    share.trip.startDate,
  ]);

  async function handleVote(listingId: string) {
    setPendingAction(`vote-${listingId}`);
    const result = await castPublishedTripVote({
      token,
      guestId: activeGuest.id,
      listingId,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to cast your vote.');
      return;
    }

    router.refresh();
    toast.success(result.data.listingId === null ? 'Vote removed.' : 'Vote updated.');
  }

  if (sortedListings.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No homes are on the board yet. Add one to get voting started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {visibleListings.map((listing) => {
        const isVoteEligible = isVoteEligibleListingStatus(listing.status);
        const isCurrentVote = currentVoteListingId === listing.id;
        const isCurrentWinner = currentWinnerListingId === listing.id;
        const tabContentFillsCard = cardView === 'votes' || cardView === 'feedback' || cardView === 'comments';
        const voteButtonLabel = !share.votingOpen
          ? 'Voting closed'
          : !isVoteEligible
            ? (isCurrentVote ? 'Your vote' : formatListingStatusLabel(listing.status))
            : isCurrentVote
              ? 'Your vote'
              : currentVoteListingId
                ? 'Move my vote here'
                : 'Vote for this house';

        return (
          <ListingCard
            key={listing.id}
            listing={listing}
            priceUnitLabel="total"
            travelLinkContext={travelLinkContext}
            roomBreakdown={cardView === 'beds' ? listing.roomBreakdown as ListingCardProps['roomBreakdown'] : null}
            showAllMetadata={cardView === 'beds'}
            showDescription={cardView === 'info'}
            separateBodyFromHeader
            contentClassName={tabContentFillsCard ? 'flex-none' : undefined}
            footerClassName={tabContentFillsCard ? 'flex-1 items-start' : undefined}
            addedTimestampPlacement="footer"
            className={cn('min-w-0 w-full', isCurrentWinner ? 'border-emerald-200 shadow-sm' : undefined)}
            imageOverlayContent={
              isCurrentWinner ? (
                <Badge className="bg-emerald-600 text-white shadow-sm">
                  Current winner
                </Badge>
              ) : undefined
            }
            actionsMenu={
              <PublishedListingActionsMenu
                listing={listing}
                isCurrentVote={isCurrentVote}
                pendingVote={pendingAction === `vote-${listing.id}`}
                onVote={() => handleVote(listing.id)}
              />
            }
            actionsMenuPlacement="footer"
            footerContent={tabContentFillsCard ? (
              <PublishedListingCardFooter
                listing={listing}
                isVoteEligible={isVoteEligible}
                isCurrentVote={isCurrentVote}
                pendingVote={pendingAction === `vote-${listing.id}`}
                voteButtonLabel={voteButtonLabel}
                onVote={() => handleVote(listing.id)}
              />
            ) : null}
          />
        );
      })}

      {rejectedListingCount > 0 ? (
        <ListingVisibilityToggleCard
          count={rejectedListingCount}
          expanded={!hideRejectedListings}
          hiddenTitle={`Show ${rejectedListingCount} rejected ${rejectedListingCount === 1 ? 'home' : 'homes'}`}
          hiddenActionLabel="Review rejected homes"
          hiddenDescription="Keep the main board focused on contenders, or open the rejected homes to review what was ruled out."
          expandedTitle="Hide rejected homes"
          expandedActionLabel="Hide rejected homes"
          expandedDescription="Rejected homes are visible at the end of the board. Hide them to get back to the shortlist."
          previewImageUrls={rejectedPreviewImageUrls}
          onToggle={() => setHideRejectedListings((current) => !current)}
        />
      ) : null}
    </div>
  );
}
