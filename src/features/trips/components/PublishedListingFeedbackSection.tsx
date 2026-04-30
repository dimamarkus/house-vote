'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Check, Plus, RefreshCcw, X } from 'lucide-react';
import { addPublishedTripListingFeedback } from '@/features/trips/actions/publishedTripActions';
import {
  LISTING_FEEDBACK_KIND,
  getListingFeedbackConfig,
  type ListingFeedbackKind,
} from '@/features/trips/constants/listing-feedback';
import { usePublishedTripGuest } from '@/features/trips/components/PublishedTripGuestContext';
import { Button } from '@/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/shadcn/dialog';
import { Textarea } from '@/ui/shadcn/textarea';
import { cn } from '@/ui/utils/cn';
import { toast } from 'sonner';

type PublishedListingFeedbackEntry = {
  id: string;
  kind: string;
  body: string;
  createdAt: Date;
  guest: {
    guestDisplayName: string;
  };
};

interface PublishedListingFeedbackSectionProps {
  listingId: string;
  kind: ListingFeedbackKind;
  entries: PublishedListingFeedbackEntry[];
  className?: string;
  formClassName?: string;
  listClassName?: string;
  composerVariant?: 'inline' | 'dialog';
  showComposerIdentity?: boolean;
  entryVariant?: 'card' | 'slim';
  headerContent?: ReactNode;
}

export function PublishedListingFeedbackSection({
  listingId,
  kind,
  entries,
  className,
  formClassName,
  listClassName,
  composerVariant = 'inline',
  showComposerIdentity = true,
  entryVariant = 'card',
  headerContent,
}: PublishedListingFeedbackSectionProps) {
  const { token, share, activeGuest } = usePublishedTripGuest();
  const commentsOpen = share.commentsOpen;
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const trimmedDraft = draft.trim();
  const isComposerDisabled = !commentsOpen || isSubmitting;
  const config = getListingFeedbackConfig(kind);
  const composerHelperText = !commentsOpen ? 'Guest feedback is closed.' : `${trimmedDraft.length}/1000`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedDraft) {
      return;
    }

    setIsSubmitting(true);
    const result = await addPublishedTripListingFeedback({
      token,
      guestId: activeGuest.id,
      listingId,
      kind,
      body: trimmedDraft,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : `Unable to add your ${config.singularLabel.toLowerCase()}.`);
      return;
    }

    setDraft('');
    setIsDialogOpen(false);
    router.refresh();
    toast.success(config.successMessage);
  }

  function renderComposerForm() {
    return (
      <form onSubmit={handleSubmit} className={cn('space-y-3', formClassName)}>
        {showComposerIdentity ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {`${config.singularLabel} as ${activeGuest.guestDisplayName}`}
            </p>
            {!commentsOpen ? (
              <p className="text-xs text-muted-foreground">Guest feedback is closed.</p>
            ) : null}
          </div>
        ) : null}
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={config.placeholder}
          disabled={isComposerDisabled}
          maxLength={1000}
          className="min-h-20"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{composerHelperText}</p>
          <Button type="submit" disabled={isComposerDisabled || trimmedDraft.length === 0}>
            {isSubmitting ? (
              <>
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                Posting
              </>
            ) : (
              config.submitLabel
            )}
          </Button>
        </div>
      </form>
    );
  }

  function renderSlimEntry(entry: PublishedListingFeedbackEntry) {
    const metadataLabel = `${entry.guest.guestDisplayName} • ${formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}`;
    const BulletIcon = kind === LISTING_FEEDBACK_KIND.PRO ? Check : X;
    const bulletClassName = kind === LISTING_FEEDBACK_KIND.PRO
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-rose-100 text-rose-700';

    return (
      <li key={entry.id} className="flex items-start gap-1.5 py-0.5">
        <span
          title={metadataLabel}
          aria-label={`Added by ${metadataLabel}`}
          className={cn(
            'mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full',
            bulletClassName,
          )}
        >
          <BulletIcon className="size-3" />
        </span>
        <p className="min-w-0 flex-1 whitespace-pre-wrap text-xs leading-snug text-foreground">{entry.body}</p>
      </li>
    );
  }

  function renderDialogTrigger(compact = false) {
    return (
      <DialogTrigger asChild>
        <Button
          weight="hollow"
          size="sm"
          disabled={!commentsOpen}
          aria-label={config.submitLabel}
          className={cn(
            compact
              ? 'h-6 rounded-full border-sky-200 bg-sky-50 px-2 text-[11px] text-sky-700 hover:bg-sky-100 hover:text-sky-800'
              : 'h-8 w-full rounded-lg border-sky-200 bg-sky-50 text-xs text-sky-700 hover:bg-sky-100 hover:text-sky-800',
          )}
        >
          <Plus className={compact ? 'size-3' : 'size-3.5'} />
          Add
        </Button>
      </DialogTrigger>
    );
  }

  function renderDialogContent() {
    return (
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{config.submitLabel}</DialogTitle>
          <DialogDescription>{config.placeholder}</DialogDescription>
        </DialogHeader>
        {renderComposerForm()}
      </DialogContent>
    );
  }

  function renderEntries() {
    return (
      <div className={cn(entryVariant === 'slim' ? '' : 'space-y-3', listClassName)}>
        {entries.length > 0 ? (
          entryVariant === 'slim' ? (
            <ul className="space-y-1">
              {entries.map(renderSlimEntry)}
            </ul>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{entry.guest.guestDisplayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{entry.body}</p>
              </div>
            ))
          )
        ) : (
          <div className={cn(
            'text-muted-foreground',
            entryVariant === 'card' ? 'rounded-xl border border-dashed p-4 text-sm' : 'py-0.5 text-xs',
          )}>
            {config.emptyMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(headerContent && composerVariant === 'dialog' ? 'space-y-1.5' : 'space-y-4', className)}>
      {composerVariant === 'dialog' ? (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {headerContent ? (
            <div className="flex items-center justify-between gap-2">
              {headerContent}
              {renderDialogTrigger(true)}
            </div>
          ) : null}
          {renderEntries()}
          {!headerContent ? (
            <div className="flex flex-col gap-2">
              {renderDialogTrigger()}
              {!commentsOpen ? (
                <p className="text-xs text-muted-foreground">Guest feedback is closed.</p>
              ) : null}
            </div>
          ) : null}
          {renderDialogContent()}
        </Dialog>
      ) : (
        <>
          {renderEntries()}
          {renderComposerForm()}
        </>
      )}
    </div>
  );
}
