'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { MessageSquare, RefreshCcw } from 'lucide-react';
import { addPublishedTripComment } from '@/features/trips/actions/publishedTripActions';
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
import { Textarea } from '@/ui/shadcn/textarea';
import { toast } from 'sonner';

interface PublishedListingCommentsSheetProps {
  token: string;
  listing: PublishedTripListingRecord;
  activeGuest: PublishedTripGuestRecord | null;
  commentsOpen: boolean;
}

export function PublishedListingCommentsSheet({
  token,
  listing,
  activeGuest,
  commentsOpen,
}: PublishedListingCommentsSheetProps) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentCount = listing.comments.length;
  const trimmedDraft = draft.trim();
  const isComposerDisabled = !activeGuest || !commentsOpen || isSubmitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeGuest || !trimmedDraft) {
      return;
    }

    setIsSubmitting(true);
    const result = await addPublishedTripComment({
      token,
      guestId: activeGuest.id,
      listingId: listing.id,
      body: trimmedDraft,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to add your comment.');
      return;
    }

    setDraft('');
    router.refresh();
    toast.success('Comment added.');
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button weight="hollow" size="sm">
          <MessageSquare className="h-4 w-4" />
          Comments
          <Badge variant="secondary" className="ml-1">
            {commentCount}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <SheetTitle>Comments</SheetTitle>
            {!commentsOpen ? <Badge variant="secondary">Closed</Badge> : null}
          </div>
          <SheetDescription>{listing.title}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {listing.comments.length > 0 ? (
            <div className="space-y-3">
              {listing.comments.map((comment) => (
                <div key={comment.id} className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{comment.guest.guestDisplayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{comment.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No comments yet. Start the discussion for this listing.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t pt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">
                {activeGuest ? `Commenting as ${activeGuest.guestDisplayName}` : 'Pick a guest name to comment'}
              </p>
              {!commentsOpen ? (
                <p className="text-xs text-muted-foreground">The owner has closed comments.</p>
              ) : null}
            </div>
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add your thoughts about this place..."
              disabled={isComposerDisabled}
              maxLength={1000}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{trimmedDraft.length}/1000</p>
              <Button type="submit" disabled={isComposerDisabled || trimmedDraft.length === 0}>
                {isSubmitting ? (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                    Posting
                  </>
                ) : (
                  'Post comment'
                )}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
