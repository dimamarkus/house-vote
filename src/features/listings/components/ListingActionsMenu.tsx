'use client';

import { useEffect, useRef, useState } from 'react';
import { Edit, EllipsisVertical, Eye } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import { LinkButton } from '@/ui/core/LinkButton';
import { ListingFormSheet } from '@/features/listings/forms/ListingFormSheet';
import { DeleteListingActionButton } from '@/features/listings/components/DeleteListingActionButton';
import { ListingStatusAction } from '@/features/listings/components/ListingStatusAction';
import { RefreshListingFromSourceButton } from '@/features/listings/components/RefreshListingFromSourceButton';
import { LISTING_STATUS, type ListingStatusValue } from '@/features/listings/constants/listing-status';
import type { ListingFormValues } from '@/features/listings/schemas';

interface ListingActionsMenuProps {
  listingId: string;
  listingTitle: string;
  tripId: string;
  listingUrl?: string | null;
  listingStatus: ListingStatusValue;
  canEdit: boolean;
  canDelete: boolean;
  canRefreshFromSource: boolean;
  canToggleStatus: boolean;
  initialStateForEdit: ListingFormValues;
}

export function ListingActionsMenu({
  listingId,
  listingTitle,
  tripId,
  listingUrl,
  listingStatus,
  canEdit,
  canDelete,
  canRefreshFromSource,
  canToggleStatus,
  initialStateForEdit,
}: ListingActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleOutsidePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const canViewSource = typeof listingUrl === 'string' && listingUrl.length > 0;
  const isRejected = listingStatus === LISTING_STATUS.REJECTED;

  return (
    <div className="relative flex justify-end" ref={menuRef}>
      <Button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="size-8 p-0"
        onClick={() => setIsOpen((current) => !current)}
        size="icon"
        title="Open listing actions"
        variant="neutral"
        weight="ghost"
      >
        <span className="sr-only">Open listing actions</span>
        <EllipsisVertical className="h-4 w-4" />
      </Button>

      {isOpen ? (
        <div
          className="absolute right-0 top-9 z-50 w-52 rounded-md border bg-background p-1 shadow-md"
          role="menu"
        >
          {canViewSource ? (
            <LinkButton
              className="h-8 w-full justify-start gap-2 px-2 text-left"
              href={listingUrl}
              onClick={() => setIsOpen(false)}
              role="menuitem"
              target="_blank"
              variant="neutral"
              weight="ghost"
            >
              <Eye className="h-4 w-4" />
              View listing
            </LinkButton>
          ) : (
            <Button
              className="h-8 w-full justify-start gap-2 px-2 text-left"
              disabled
              role="menuitem"
              variant="neutral"
              weight="ghost"
            >
              <Eye className="h-4 w-4" />
              View listing
            </Button>
          )}

          {canEdit ? (
            <ListingFormSheet listingId={listingId} tripId={tripId} initialState={initialStateForEdit}>
              <Button
                className="h-8 w-full justify-start gap-2 px-2 text-left"
                onClick={() => setIsOpen(false)}
                role="menuitem"
                variant="neutral"
                weight="ghost"
              >
                <Edit className="h-4 w-4" />
                Edit listing
              </Button>
            </ListingFormSheet>
          ) : null}

          {canRefreshFromSource ? (
            <div className="px-1 py-0.5" role="menuitem">
              <RefreshListingFromSourceButton
                listingId={listingId}
                className="h-auto min-h-8 w-full justify-start px-1 py-1.5 text-left font-normal"
                size="sm"
                variant="neutral"
                weight="ghost"
                onRefreshStart={() => setIsOpen(false)}
              />
            </div>
          ) : null}

          {canDelete ? (
            <DeleteListingActionButton
              buttonClassName="h-8 w-full justify-start gap-2 px-2 text-left"
              buttonSize="sm"
              buttonText="Delete listing"
              buttonVariant="destructive"
              buttonWeight="ghost"
              listingId={listingId}
              listingTitle={listingTitle}
            />
          ) : null}

          {canToggleStatus ? (
            <ListingStatusAction
              buttonClassName="h-8 w-full justify-start gap-2 px-2 text-left"
              listingId={listingId}
              currentStatus={listingStatus}
              onStatusUpdate={() => setIsOpen(false)}
              size="md"
              variant={isRejected ? 'neutral' : 'destructive'}
              weight="ghost"
            />
          ) : null}

          {!canEdit && !canDelete && !canRefreshFromSource && !canToggleStatus && !canViewSource ? (
            <div className="flex h-8 items-center px-2 text-xs text-muted-foreground">
              No actions available
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
