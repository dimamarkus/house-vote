'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { castPublishedTripVote } from '@/features/trips/actions/publishedTripActions';
import type { PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';
import {
  formatListingStatusLabel,
  isVoteEligibleListingStatus,
} from '@/features/listings/constants/listing-status';
import { PublishedListingCardFooter } from '@/features/trips/components/PublishedListingCardFooter';
import { usePublishedGuestSession } from '@/features/trips/hooks/usePublishedGuestSession';
import type { PublishedTripListingRecord, PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { ListingCard, type ListingCardProps } from '@/features/listings/components/ListingCard';
import { Badge } from '@/ui/shadcn/badge';
import { Card, CardContent } from '@/ui/shadcn/card';
import { cn } from '@/ui/utils/cn';
import { toast } from 'sonner';

interface PublishedTripPageClientProps {
  token: string;
  share: PublishedTripShareRecord;
  listings: PublishedTripListingRecord[];
  initialSession?: PublishedGuestSessionValue | null;
}

export function PublishedTripPageClient({
  token,
  share,
  listings,
  initialSession = null,
}: PublishedTripPageClientProps) {
  const router = useRouter();
  const { activeGuest, clearSession, rawSession, session } = usePublishedGuestSession(
    share.trip.id,
    share.guests,
    initialSession,
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const joinHref = `/share/${token}/join`;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router]);

  useEffect(() => {
    if (rawSession && !session) {
      clearSession();
      router.replace(joinHref);
    }
  }, [clearSession, joinHref, rawSession, router, session]);

  useEffect(() => {
    if (session && !activeGuest) {
      clearSession();
      toast.error('Your guest session is no longer available. Please pick your name again.');
      router.replace(joinHref);
    }
  }, [activeGuest, clearSession, joinHref, router, session]);

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

  const currentWinnerListingId = useMemo(() => {
    return sortedListings.find((listing) => (
      isVoteEligibleListingStatus(listing.status) && listing.votes.length > 0
    ))?.id ?? null;
  }, [sortedListings]);

  const currentVoteListingId = activeGuest?.votes[0]?.listingId ?? null;

  async function handleVote(listingId: string) {
    if (!activeGuest) {
      return;
    }

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
    toast.success(currentVoteListingId === listingId ? 'Your vote is still here.' : 'Vote updated.');
  }

  if (!activeGuest) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Opening guest picker...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {sortedListings.length > 0 ? (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedListings.map((listing) => {
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
                footerContent={
                  <PublishedListingCardFooter
                    token={token}
                    listing={listing}
                    activeGuest={activeGuest}
                    commentsOpen={share.commentsOpen}
                    votingOpen={share.votingOpen}
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
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No homes are on the board yet. Add one to get voting started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
