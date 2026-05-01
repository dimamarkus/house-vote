'use client';

import { Eye, EyeOff, Image as ImageIcon } from 'lucide-react';
import { ImageWithFallback } from '@/ui/core/ImageWithFallback';
import { cn } from '@/ui/utils/cn';

interface ListingVisibilityToggleCardProps {
  className?: string;
  count: number;
  expanded: boolean;
  expandedActionLabel: string;
  expandedDescription: string;
  expandedTitle: string;
  hiddenActionLabel: string;
  hiddenDescription: string;
  hiddenTitle: string;
  onToggle: () => void;
  previewImageUrls?: string[];
}

export function ListingVisibilityToggleCard({
  className,
  count,
  expanded,
  expandedActionLabel,
  expandedDescription,
  expandedTitle,
  hiddenActionLabel,
  hiddenDescription,
  hiddenTitle,
  onToggle,
  previewImageUrls = [],
}: ListingVisibilityToggleCardProps) {
  const title = expanded ? expandedTitle : hiddenTitle;
  const description = expanded ? expandedDescription : hiddenDescription;
  const actionLabel = expanded ? expandedActionLabel : hiddenActionLabel;
  const countLabel = expanded ? `${count} shown` : `${count} hidden`;
  const Icon = expanded ? EyeOff : Eye;
  const visiblePreviewImageUrls = previewImageUrls.slice(0, 3);
  const hasPreviewImages = visiblePreviewImageUrls.length > 0;

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={title}
      onClick={onToggle}
      className={cn(
        'group flex min-h-[360px] w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-dashed border-border/80 bg-card text-left text-card-foreground shadow-sm transition duration-200',
        'hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      {hasPreviewImages ? (
        <div className={cn(
          'grid h-36 overflow-hidden border-b border-border/50 bg-muted',
          visiblePreviewImageUrls.length === 1 ? 'grid-cols-1' : undefined,
          visiblePreviewImageUrls.length === 2 ? 'grid-cols-2' : undefined,
          visiblePreviewImageUrls.length >= 3 ? 'grid-cols-3' : undefined,
        )}>
          {visiblePreviewImageUrls.map((imageUrl, index) => (
            <div key={`${imageUrl}-${index}`} className="relative overflow-hidden">
              <ImageWithFallback
                src={imageUrl}
                alt=""
                width={240}
                height={144}
                className="h-full w-full object-cover opacity-80 grayscale transition duration-200 group-hover:opacity-100 group-hover:grayscale-0"
                fallbackClassName="h-full w-full"
                FallbackIcon={ImageIcon}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            {countLabel}
          </span>
          <span className="rounded-full bg-primary/10 p-2 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-4 w-4" />
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-lg font-semibold tracking-tight">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>

        <div className="mt-auto pt-6">
          <span className="inline-flex items-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
            {actionLabel}
          </span>
        </div>
      </div>
    </button>
  );
}
