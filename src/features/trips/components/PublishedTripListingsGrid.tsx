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
import type { PublishedTripListingRecord } from '@/features/trips/publishedDb';
import { ListingCard, type ListingCardProps } from '@/features/listings/components/ListingCard';
import { Badge } from '@/ui/shadcn/badge';
import { Button } from '@/ui/shadcn/button';
import { Card, CardContent } from '@/ui/shadcn/card';
import { cn } from '@/ui/utils/cn';

interface PublishedTripListingsGridProps {
  listings: PublishedTripListingRecord[];
}

export function PublishedTripListingsGrid({ listings }: PublishedTripListingsGridProps) {
  const { token, share, activeGuest } = usePublishedTripGuest();
  const router = useRouter();
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
  const rejectedListingCount = sortedListings.filter((listing) => (
    listing.status === LISTING_STATUS.REJECTED
  )).length;
  const visibleListings = hideRejectedListings
    ? sortedListings.filter((listing) => listing.status !== LISTING_STATUS.REJECTED)
    : sortedListings;

  const currentWinnerListingId = useMemo(() => {
    return sortedListings.find((listing) => (
      isVoteEligibleListingStatus(listing.status) && listing.votes.length > 0
    ))?.id ?? null;
  }, [sortedListings]);

  const currentVoteListingId = activeGuest.votes[0]?.listingId ?? null;
  const travelLinkContext = useMemo(() => ({
    numberOfPeople: share.trip.numberOfPeople ?? null,
    startDate: share.trip.startDate ? new Date(share.trip.startDate) : null,
    endDate: share.trip.endDate ? new Date(share.trip.endDate) : null,
  }), [share.trip.endDate, share.trip.numberOfPeople, share.trip.startDate]);

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
    <div className="flex min-w-0 flex-col gap-4">
      {rejectedListingCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">
          <div>
            <p className="text-sm font-medium">Board view</p>
            <p className="text-xs text-muted-foreground">
              {rejectedListingCount} rejected {rejectedListingCount === 1 ? 'home' : 'homes'} on this board
            </p>
          </div>
          <Button
            type="button"
            weight={hideRejectedListings ? 'solid' : 'hollow'}
            variant="neutral"
            size="sm"
            aria-pressed={hideRejectedListings}
            onClick={() => setHideRejectedListings((current) => !current)}
          >
            {hideRejectedListings ? 'Show rejected homes' : 'Hide rejected homes'}
          </Button>
        </div>
      ) : null}

      {visibleListings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Rejected homes are hidden. Show them to review the full board.
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleListings.map((listing) => {
            const isVoteEligible = isVoteEligibleListingStatus(listing.status);
            const isCurrentVote = currentVoteListingId === listing.id;
            const isCurrentWinner = currentWinnerListingId === listing.id;
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
                roomBreakdown={listing.roomBreakdown as ListingCardProps['roomBreakdown']}
                showAllMetadata
                className={cn('min-w-0 w-full', isCurrentWinner ? 'border-emerald-200 shadow-sm' : undefined)}
                imageOverlayContent={
                  isCurrentWinner ? (
                    <Badge className="bg-emerald-600 text-white shadow-sm">
                      Current winner
                    </Badge>
                  ) : undefined
                }
                actionsMenu={<PublishedListingActionsMenu listing={listing} />}
                footerContent={
                  <PublishedListingCardFooter
                    listing={listing}
                    isVoteEligible={isVoteEligible}
                    isCurrentVote={isCurrentVote}
                    pendingVote={pendingAction === `vote-${listing.id}`}
                    voteButtonLabel={voteButtonLabel}
                    onVote={() => handleVote(listing.id)}
                  />
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
