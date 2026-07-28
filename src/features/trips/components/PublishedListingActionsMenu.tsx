'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit, EllipsisVertical, Eye, Heart, MessageSquare, Plus } from 'lucide-react';
import { isVoteEligibleListingStatus } from '@/features/listings/constants/listing-status';
import {
  LISTING_FEEDBACK_KIND,
  type ListingFeedbackKind,
} from '@/features/trips/constants/listing-feedback';
import type { PublishedTripListingRecord } from '@/features/trips/publishedDb';
import { PublishedListingEditSheet } from '@/features/trips/components/PublishedListingEditSheet';
import { PublishedListingFeedbackDialog } from '@/features/trips/components/PublishedListingFeedbackSection';
import { usePublishedTripGuest } from '@/features/trips/components/PublishedTripGuestContext';
import { getPartyUnitLabels } from '@/features/trips/utils/partyUnitLabels';
import { Button } from '@/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/shadcn/dropdown-menu';
import { cn } from '@/ui/utils/cn';

interface PublishedListingActionsMenuProps {
  listing: PublishedTripListingRecord;
  isCurrentVote: boolean;
  onVote: () => void;
  pendingVote: boolean;
}

export function PublishedListingActionsMenu({
  listing,
  isCurrentVote,
  onVote,
  pendingVote,
}: PublishedListingActionsMenuProps) {
  const { share } = usePublishedTripGuest();
  const [editOpen, setEditOpen] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<ListingFeedbackKind | null>(null);

  const guestEditsAllowed = share.allowGuestSuggestions;
  const canViewSource = typeof listing.url === 'string' && listing.url.length > 0;
  const canEdit = guestEditsAllowed;
  const commentsDisabledReason = !share.commentsOpen
    ? `${getPartyUnitLabels(share.trip.partyUnit).Singular} feedback is closed`
    : undefined;
  const editDisabledReason = !guestEditsAllowed
    ? `The trip owner has disabled ${getPartyUnitLabels(share.trip.partyUnit).singular} edits`
    : undefined;
  const canVote = share.votingOpen && isVoteEligibleListingStatus(listing.status) && !pendingVote;
  const voteDisabledReason = !share.votingOpen
    ? 'Voting is closed'
    : !isVoteEligibleListingStatus(listing.status)
      ? 'This listing is not eligible for votes'
      : pendingVote
        ? 'Vote is updating'
        : undefined;
  const voteActionLabel = isCurrentVote ? 'Remove my vote' : 'Vote for this listing';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-8 border border-background/60 bg-background/90 p-0 shadow-sm backdrop-blur"
            size="icon"
            title="Open listing actions"
            variant="neutral"
            weight="ghost"
          >
            <span className="sr-only">Open listing actions</span>
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          {canViewSource ? (
            <DropdownMenuItem asChild>
              <Link href={listing.url as string} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4" />
                View source
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <Eye className="h-4 w-4" />
              View source
            </DropdownMenuItem>
          )}

          {canEdit ? (
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Edit className="h-4 w-4" />
              Edit details
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled title={editDisabledReason}>
              <Edit className="h-4 w-4" />
              Edit details
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            disabled={!share.commentsOpen}
            onSelect={() => setFeedbackKind(LISTING_FEEDBACK_KIND.PRO)}
            title={commentsDisabledReason}
          >
            <Plus className="h-4 w-4" />
            Add pro
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!share.commentsOpen}
            onSelect={() => setFeedbackKind(LISTING_FEEDBACK_KIND.CON)}
            title={commentsDisabledReason}
          >
            <Plus className="h-4 w-4" />
            Add con
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!share.commentsOpen}
            onSelect={() => setFeedbackKind(LISTING_FEEDBACK_KIND.COMMENT)}
            title={commentsDisabledReason}
          >
            <MessageSquare className="h-4 w-4" />
            Add comment
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canVote}
            onSelect={onVote}
            title={voteDisabledReason}
          >
            <Heart className={cn('h-4 w-4', isCurrentVote ? 'fill-current' : 'fill-none')} />
            {voteActionLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canEdit ? (
        <PublishedListingEditSheet
          listing={listing}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
      {feedbackKind ? (
        <PublishedListingFeedbackDialog
          listingId={listing.id}
          kind={feedbackKind}
          open
          onOpenChange={(open) => {
            if (!open) {
              setFeedbackKind(null);
            }
          }}
        />
      ) : null}
    </>
  );
}
