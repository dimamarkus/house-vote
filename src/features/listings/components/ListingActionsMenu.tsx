'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit, EllipsisVertical, Eye, RefreshCw, Trash2, Ban, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/shadcn/dropdown-menu';
import { ListingFormSheet } from '@/features/listings/forms/ListingFormSheet';
import { deleteListing } from '@/features/listings/actions/deleteListing';
import { updateListingStatus } from '@/features/listings/actions/updateListingStatus';
import { refreshListingFromSourceUrl } from '@/features/listings/actions/refreshListingFromSourceUrl';
import { errorToString } from '@/core/errors';
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
  const router = useRouter();
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canViewSource = typeof listingUrl === 'string' && listingUrl.length > 0;
  const isRejected = listingStatus === LISTING_STATUS.REJECTED;
  const nextStatus: ListingStatusValue = isRejected
    ? LISTING_STATUS.POTENTIAL
    : LISTING_STATUS.REJECTED;
  const toggleStatusLabel = isRejected ? 'Unreject listing' : 'Reject listing';
  const ToggleStatusIcon = isRejected ? Check : Ban;

  const noActions =
    !canEdit && !canDelete && !canRefreshFromSource && !canToggleStatus && !canViewSource;

  async function handleRefresh() {
    setIsRefreshing(true);
    const loadingToastId = toast.loading('Refreshing from source…');

    try {
      const result = await refreshListingFromSourceUrl({ listingId });

      if (!result.success) {
        toast.error(errorToString(result.error || 'Refresh failed'), { id: loadingToastId });
        return;
      }

      if (!result.data) {
        toast.error('Refresh finished without listing data.', { id: loadingToastId });
        return;
      }

      const missingFields = result.data.missingFields ?? [];
      const successMessage =
        missingFields.length > 0
          ? `Updated "${result.data.listingTitle}". Still missing: ${missingFields.join(', ')}.`
          : `Updated "${result.data.listingTitle}".`;

      toast.success(successMessage, { id: loadingToastId });
      router.refresh();
    } catch (error) {
      toast.error(errorToString(error), { id: loadingToastId });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleToggleStatus() {
    setIsTogglingStatus(true);
    const formData = new FormData();
    formData.append('listingId', listingId);
    formData.append('status', nextStatus);

    try {
      const result = await updateListingStatus(formData);
      if (!result.success) {
        toast.error('Failed to update listing status');
        return;
      }
      toast.success(
        isRejected ? 'Listing has been unrejected' : 'Listing has been rejected',
      );
      router.refresh();
    } catch {
      toast.error('An error occurred while updating status');
    } finally {
      setIsTogglingStatus(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      listingTitle
        ? `Delete "${listingTitle}"? This cannot be undone.`
        : 'This will permanently delete the listing. Continue?',
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteListing(listingId);
      if (!result.success) {
        toast.error(
          typeof result.error === 'string'
            ? result.error
            : listingTitle
              ? `Failed to delete ${listingTitle}.`
              : 'Failed to delete listing',
        );
        return;
      }
      toast.success(
        listingTitle ? `${listingTitle} deleted successfully.` : 'Listing deleted successfully',
      );
      router.refresh();
    } catch {
      toast.error('An error occurred while deleting the listing');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
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
            <DropdownMenuItem onSelect={() => setEditSheetOpen(true)}>
              <Edit className="h-4 w-4" />
              Edit listing
            </DropdownMenuItem>
          ) : null}

          {canRefreshFromSource ? (
            <DropdownMenuItem
              disabled={isRefreshing}
              onSelect={(event) => {
                event.preventDefault();
                void handleRefresh();
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
                void handleToggleStatus();
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
                  void handleDelete();
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
