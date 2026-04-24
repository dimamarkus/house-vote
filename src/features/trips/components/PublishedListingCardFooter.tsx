'use client';

import { Heart, RefreshCcw } from 'lucide-react';
import {
  LISTING_FEEDBACK_KIND,
  getListingFeedbackConfig,
} from '@/features/trips/constants/listing-feedback';
import { PublishedListingCommentsSheet } from '@/features/trips/components/PublishedListingCommentsSheet';
import { PublishedListingFeedbackSection } from '@/features/trips/components/PublishedListingFeedbackSection';
import { usePublishedTripGuest } from '@/features/trips/components/PublishedTripGuestContext';
import type { PublishedTripCommentRecord, PublishedTripListingRecord } from '@/features/trips/publishedDb';
import { Badge } from '@/ui/shadcn/badge';
import { Button } from '@/ui/shadcn/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/shadcn/tabs';
import { cn } from '@/ui/utils/cn';

interface PublishedListingCardFooterProps {
  listing: PublishedTripListingRecord;
  isVoteEligible: boolean;
  isCurrentVote: boolean;
  pendingVote: boolean;
  voteButtonLabel: string;
  onVote: () => void;
}

const TAB_VALUE = {
  votes: 'votes',
  pros: 'pros',
  cons: 'cons',
} as const;

export function PublishedListingCardFooter({
  listing,
  isVoteEligible,
  isCurrentVote,
  pendingVote,
  voteButtonLabel,
  onVote,
}: PublishedListingCardFooterProps) {
  const { share } = usePublishedTripGuest();
  const votingOpen = share.votingOpen;
  const comments = listing.comments as PublishedTripCommentRecord[];
  const pros = comments.filter((comment) => comment.kind === LISTING_FEEDBACK_KIND.PRO);
  const cons = comments.filter((comment) => comment.kind === LISTING_FEEDBACK_KIND.CON);
  const votesConfig = {
    pluralLabel: 'Votes',
  };
  const prosConfig = getListingFeedbackConfig(LISTING_FEEDBACK_KIND.PRO);
  const consConfig = getListingFeedbackConfig(LISTING_FEEDBACK_KIND.CON);
  const voterNames = listing.votes.map((vote) => vote.guest.guestDisplayName);
  const voteCount = listing.votes.length;
  const commentCount = comments.filter((comment) => comment.kind === LISTING_FEEDBACK_KIND.COMMENT).length;

  return (
    <div className="flex w-full flex-col gap-3">
      <Tabs defaultValue={TAB_VALUE.votes} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value={TAB_VALUE.votes} className="gap-2 py-2">
            <span>{votesConfig.pluralLabel}</span>
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {voteCount}
            </span>
          </TabsTrigger>
          <TabsTrigger value={TAB_VALUE.pros} className="gap-2 py-2">
            <span>{prosConfig.pluralLabel}</span>
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {pros.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value={TAB_VALUE.cons} className="gap-2 py-2">
            <span>{consConfig.pluralLabel}</span>
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {cons.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={TAB_VALUE.votes}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-h-9 flex-1 flex-wrap gap-2">
                {voterNames.length > 0 ? (
                  voterNames.map((voterName) => (
                    <Badge key={`${listing.id}-${voterName}`} variant="secondary">
                      {voterName}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No votes yet.</p>
                )}
              </div>
              <Button
                onClick={onVote}
                disabled={!votingOpen || !isVoteEligible || pendingVote}
                size="sm"
                aria-label={voteButtonLabel}
                aria-pressed={isCurrentVote}
                title={voteButtonLabel}
                className={cn(
                  'shrink-0 rounded-full px-4 shadow-sm',
                  isCurrentVote
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'bg-foreground text-background hover:bg-foreground/90',
                  (!votingOpen || !isVoteEligible) && 'border border-input bg-background text-muted-foreground shadow-none hover:bg-background',
                )}
              >
                {pendingVote ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className={cn('h-4 w-4', isCurrentVote ? 'fill-current' : 'fill-none')} />
                )}
                <span>{voteButtonLabel}</span>
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value={TAB_VALUE.pros}>
          <PublishedListingFeedbackSection
            listingId={listing.id}
            kind={LISTING_FEEDBACK_KIND.PRO}
            entries={pros}
            listClassName="max-h-40 space-y-2 overflow-y-auto pr-1"
            composerVariant="dialog"
            showComposerIdentity={false}
            entryVariant="slim"
          />
        </TabsContent>

        <TabsContent value={TAB_VALUE.cons}>
          <PublishedListingFeedbackSection
            listingId={listing.id}
            kind={LISTING_FEEDBACK_KIND.CON}
            entries={cons}
            listClassName="max-h-40 space-y-2 overflow-y-auto pr-1"
            composerVariant="dialog"
            showComposerIdentity={false}
            entryVariant="slim"
          />
        </TabsContent>
      </Tabs>

      <div className="border-t border-border/50 pt-3">
        <PublishedListingCommentsSheet
          listing={listing}
          triggerLabel={commentCount === 0 ? 'Add a comment' : `View ${commentCount} comment${commentCount === 1 ? '' : 's'}`}
        />
      </div>
    </div>
  );
}
