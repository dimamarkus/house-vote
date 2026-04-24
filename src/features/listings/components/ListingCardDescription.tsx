import { StickyNote } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/shadcn/dialog';

const TRUNCATE_LENGTH = 160;

interface ListingCardDescriptionProps {
  listingTitle: string;
  sourceDescription?: string | null;
  notes?: string | null;
}

export function ListingCardDescription({
  listingTitle,
  sourceDescription,
  notes,
}: ListingCardDescriptionProps) {
  const trimmedSourceDescription = sourceDescription?.trim() ?? '';
  const trimmedNotes = notes?.trim() ?? '';
  const detailText = trimmedSourceDescription || trimmedNotes || null;

  if (!detailText) {
    return null;
  }

  const detailLabel = trimmedSourceDescription ? 'Description' : 'Notes';
  const hasLongDescription = detailText.length > TRUNCATE_LENGTH;
  const detailPreview = hasLongDescription
    ? `${detailText.slice(0, TRUNCATE_LENGTH).trimEnd()}...`
    : detailText;

  return (
    <Dialog>
      <div className="col-span-2 flex items-start gap-1">
        <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-muted-foreground wrap-break-word">{detailPreview}</p>
          {hasLongDescription ? (
            <DialogTrigger asChild>
              <button
                type="button"
                className="mt-1 text-xs font-medium text-muted-foreground/90 hover:text-foreground hover:underline"
              >
                {`Read Full ${detailLabel}`}
              </button>
            </DialogTrigger>
          ) : null}
        </div>
      </div>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{`Listing ${detailLabel}`}</DialogTitle>
          <DialogDescription>{listingTitle}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{detailText}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
