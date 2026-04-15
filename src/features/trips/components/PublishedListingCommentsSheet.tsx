'use client';

import { MessageSquare } from 'lucide-react';
import {
  LISTING_FEEDBACK_KIND,
  getListingFeedbackConfig,
} from '@/features/trips/constants/listing-feedback';
import { PublishedListingFeedbackSection } from '@/features/trips/components/PublishedListingFeedbackSection';
import type { PublishedTripGuestRecord, PublishedTripListingRecord } from '@/features/trips/publishedDb';
import { Badge } from '@/ui/shadcn/badge';
import { Button } from '@/ui/shadcn/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/ui/shadcn/sheet';

interface PublishedListingCommentsSheetProps {
  token: string;
  listing: PublishedTripListingRecord;
  activeGuest: PublishedTripGuestRecord | null;
  commentsOpen: boolean;
  triggerLabel: string;
}

export function PublishedListingCommentsSheet({
  token,
  listing,
  activeGuest,
  commentsOpen,
  triggerLabel,
}: PublishedListingCommentsSheetProps) {
  const commentKind = LISTING_FEEDBACK_KIND.COMMENT;
  const comments = listing.comments.filter((comment) => comment.kind === commentKind);
  const commentConfig = getListingFeedbackConfig(commentKind);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button weight="link" size="sm" className="h-auto px-0 py-0 text-sm text-muted-foreground hover:text-foreground">
          <MessageSquare className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <SheetTitle>{commentConfig.pluralLabel}</SheetTitle>
            {!commentsOpen ? <Badge variant="secondary">Closed</Badge> : null}
          </div>
          <SheetDescription>{listing.title}</SheetDescription>
        </SheetHeader>
        <PublishedListingFeedbackSection
          token={token}
          listingId={listing.id}
          kind={commentKind}
          entries={comments}
          activeGuest={activeGuest}
          commentsOpen={commentsOpen}
          className="flex h-full flex-col"
          listClassName="flex-1 overflow-y-auto py-4"
          formClassName="border-t pt-4"
        />
      </SheetContent>
    </Sheet>
  );
}
