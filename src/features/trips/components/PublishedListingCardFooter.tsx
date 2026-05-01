'use client';

import { useState } from 'react';
import { Heart, MessageSquare, Plus, RefreshCcw } from 'lucide-react';
import {
  LISTING_FEEDBACK_KIND,
  getListingFeedbackConfig,
} from '@/features/trips/constants/listing-feedback';
import { PublishedListingCommentsSheet } from '@/features/trips/components/PublishedListingCommentsSheet';
import {
  PublishedListingFeedbackDialog,
  PublishedListingFeedbackSection,
} from '@/features/trips/components/PublishedListingFeedbackSection';
import { usePublishedTripGuest } from '@/features/trips/components/PublishedTripGuestContext';
import { usePublishedListingCardView } from '@/features/trips/hooks/usePublishedListingCardView';
import type { PublishedTripCommentRecord, PublishedTripListingRecord } from '@/features/trips/publishedDb';
import { Badge } from '@/ui/shadcn/badge';
import { Button } from '@/ui/shadcn/button';
import { cn } from '@/ui/utils/cn';

interface PublishedListingCardFooterProps {
  listing: PublishedTripListingRecord;
  isVoteEligible: boolean;
  isCurrentVote: boolean;
  pendingVote: boolean;
  voteButtonLabel: string;
  onVote: () => void;
}

const COMMENT_PREVIEW_LIMIT = 3;
const COMMENT_PREVIEW_CHARACTER_LIMIT = 180;

export function PublishedListingCardFooter({
  listing,
  isVoteEligible,
  isCurrentVote,
  pendingVote,
  voteButtonLabel,
  onVote,
}: PublishedListingCardFooterProps) {
  const { share } = usePublishedTripGuest();
  const [cardView] = usePublishedListingCardView();
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(() => new Set());
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const votingOpen = share.votingOpen;
  const comments = listing.comments as PublishedTripCommentRecord[];
  const pros = comments.filter((comment) => comment.kind === LISTING_FEEDBACK_KIND.PRO);
  const cons = comments.filter((comment) => comment.kind === LISTING_FEEDBACK_KIND.CON);
  const listingComments = comments.filter((comment) => comment.kind === LISTING_FEEDBACK_KIND.COMMENT);
  const prosConfig = getListingFeedbackConfig(LISTING_FEEDBACK_KIND.PRO);
  const consConfig = getListingFeedbackConfig(LISTING_FEEDBACK_KIND.CON);
  const commentsConfig = getListingFeedbackConfig(LISTING_FEEDBACK_KIND.COMMENT);
  const voterNames = listing.votes.map((vote) => vote.guest.guestDisplayName);
  const previewComments = [...listingComments]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, COMMENT_PREVIEW_LIMIT);
  const hasMoreComments = listingComments.length > previewComments.length;

  function toggleExpandedComment(commentId: string) {
    setExpandedCommentIds((current) => {
      const next = new Set(current);

      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }

      return next;
    });
  }

  function renderCommentBody(comment: PublishedTripCommentRecord) {
    const isExpanded = expandedCommentIds.has(comment.id);
    const shouldTruncate = comment.body.length > COMMENT_PREVIEW_CHARACTER_LIMIT;
    const body = shouldTruncate && !isExpanded
      ? `${comment.body.slice(0, COMMENT_PREVIEW_CHARACTER_LIMIT).trimEnd()}...`
      : comment.body;

    return (
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-xs leading-snug text-foreground">
        {body}
        {shouldTruncate ? (
          <>
            {' '}
            <button
              type="button"
              onClick={() => toggleExpandedComment(comment.id)}
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {isExpanded ? 'Show less' : 'See more'}
            </button>
          </>
        ) : null}
      </p>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-3">
      {cardView === 'votes' ? (
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
      ) : cardView === 'feedback' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <section>
            <PublishedListingFeedbackSection
              listingId={listing.id}
              kind={LISTING_FEEDBACK_KIND.PRO}
              entries={pros}
              listClassName="space-y-1"
              composerVariant="dialog"
              showComposerIdentity={false}
              entryVariant="slim"
              headerContent={
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  {prosConfig.pluralLabel}
                </h4>
              }
            />
          </section>
          <section>
            <PublishedListingFeedbackSection
              listingId={listing.id}
              kind={LISTING_FEEDBACK_KIND.CON}
              entries={cons}
              listClassName="space-y-1"
              composerVariant="dialog"
              showComposerIdentity={false}
              entryVariant="slim"
              headerContent={
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                  {consConfig.pluralLabel}
                </h4>
              }
            />
          </section>
        </div>
      ) : cardView === 'comments' ? (
        <section className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
              {commentsConfig.pluralLabel}
            </h4>
            <Button
              weight="hollow"
              size="sm"
              disabled={!share.commentsOpen}
              aria-label={commentsConfig.submitLabel}
              title={commentsConfig.submitLabel}
              onClick={() => setCommentDialogOpen(true)}
              className="size-6 rounded-full border-sky-200 bg-transparent p-0 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
            >
              <Plus className="size-3" />
            </Button>
          </div>
          {previewComments.length > 0 ? (
            <ul className="space-y-1">
              {previewComments.map((comment) => (
                <li key={comment.id} className="flex items-start gap-1.5 py-0.5">
                  <span
                    title={comment.guest.guestDisplayName}
                    aria-label={`Comment by ${comment.guest.guestDisplayName}`}
                    className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700"
                  >
                    <MessageSquare className="size-3" />
                  </span>
                  {renderCommentBody(comment)}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-0.5 text-xs text-muted-foreground">
              {commentsConfig.emptyMessage}
            </div>
          )}
          {hasMoreComments ? (
            <PublishedListingCommentsSheet
              listing={listing}
              triggerLabel={`View all ${listingComments.length} comments`}
            />
          ) : null}
          <PublishedListingFeedbackDialog
            listingId={listing.id}
            kind={LISTING_FEEDBACK_KIND.COMMENT}
            open={commentDialogOpen}
            onOpenChange={setCommentDialogOpen}
            showComposerIdentity={false}
          />
        </section>
      ) : null}
    </div>
  );
}
