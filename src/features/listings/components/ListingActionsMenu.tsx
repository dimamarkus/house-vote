'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Ban, Check, Edit, EllipsisVertical, Eye, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/shadcn/dropdown-menu';
import { ListingFormSheet } from '@/features/listings/forms/ListingFormSheet';
import { useListingActions } from '@/features/listings/hooks/useListingActions';
import {
  LISTING_STATUS,
  type ListingStatusValue,
} from '@/features/listings/constants/listing-status';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const { refresh, toggleStatus, deleteListing, isRefreshing, isTogglingStatus, isDeleting } =
    useListingActions({
      listingId,
      listingTitle,
      listingStatus,
      onActionComplete: () => setIsMenuOpen(false),
    });

  const canViewSource = typeof listingUrl === 'string' && listingUrl.length > 0;
  const isRejected = listingStatus === LISTING_STATUS.REJECTED;
  const toggleStatusLabel = isRejected ? 'Unreject listing' : 'Reject listing';
  const ToggleStatusIcon = isRejected ? Check : Ban;

  const noActions =
    !canEdit && !canDelete && !canRefreshFromSource && !canToggleStatus && !canViewSource;

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-8 p-0"
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
              <Link href={listingUrl as string} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4" />
                View listing
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <Eye className="h-4 w-4" />
              View listing
            </DropdownMenuItem>
          )}

          {canEdit ? (
            <DropdownMenuItem
              onSelect={() => {
                setEditSheetOpen(true);
                setIsMenuOpen(false);
              }}
            >
              <Edit className="h-4 w-4" />
              Edit listing
            </DropdownMenuItem>
          ) : null}

          {canRefreshFromSource ? (
            <DropdownMenuItem
              disabled={isRefreshing}
              onSelect={(event) => {
                event.preventDefault();
                void refresh();
              }}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing…' : 'Refresh from source'}
            </DropdownMenuItem>
          ) : null}

          {canToggleStatus ? (
            <DropdownMenuItem
              disabled={isTogglingStatus}
              destructive={!isRejected}
              onSelect={(event) => {
                event.preventDefault();
                void toggleStatus();
              }}
            >
              <ToggleStatusIcon className="h-4 w-4" />
              {isTogglingStatus ? 'Updating…' : toggleStatusLabel}
            </DropdownMenuItem>
          ) : null}

          {canDelete ? (
            <>
              {(canEdit || canRefreshFromSource || canToggleStatus || canViewSource) ? (
                <DropdownMenuSeparator />
              ) : null}
              <DropdownMenuItem
                disabled={isDeleting}
                destructive
                onSelect={(event) => {
                  event.preventDefault();
                  void deleteListing();
                }}
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting…' : 'Delete listing'}
              </DropdownMenuItem>
            </>
          ) : null}

          {noActions ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">No actions available</div>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {canEdit ? (
        <ListingFormSheet
          listingId={listingId}
          tripId={tripId}
          initialState={initialStateForEdit}
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
        />
      ) : null}
    </>
  );
}
