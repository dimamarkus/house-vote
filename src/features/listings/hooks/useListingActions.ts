'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteListing as deleteListingAction } from '@/features/listings/actions/deleteListing';
import { refreshListingFromSourceUrl } from '@/features/listings/actions/refreshListingFromSourceUrl';
import { updateListingStatus } from '@/features/listings/actions/updateListingStatus';
import {
  LISTING_STATUS,
  type ListingStatusValue,
} from '@/features/listings/constants/listing-status';
import { errorToString } from '@/core/errors';

interface UseListingActionsArgs {
  listingId: string;
  listingTitle: string;
  listingStatus: ListingStatusValue;
  /**
   * Optional callback fired after a successful mutation finishes its refresh.
   * The caller typically uses this to close the dropdown menu that hosts the
   * action buttons.
   */
  onActionComplete?: () => void;
}

export interface UseListingActionsResult {
  refresh: () => Promise<void>;
  toggleStatus: () => Promise<void>;
  deleteListing: () => Promise<void>;
  isRefreshing: boolean;
  isTogglingStatus: boolean;
  isDeleting: boolean;
}

/**
 * Wraps the three server-action mutations that a per-listing dropdown menu
 * can trigger: refresh-from-source, toggle-status (reject/unreject), and
 * delete. Owns the pending flag for each action so the UI can show spinners
 * without the component needing to wire up three `useState` calls by hand.
 */
export function useListingActions({
  listingId,
  listingTitle,
  listingStatus,
  onActionComplete,
}: UseListingActionsArgs): UseListingActionsResult {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function refresh() {
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
      const successMessage = missingFields.length > 0
        ? `Updated "${result.data.listingTitle}". Still missing: ${missingFields.join(', ')}.`
        : `Updated "${result.data.listingTitle}".`;

      toast.success(successMessage, { id: loadingToastId });
      onActionComplete?.();
      router.refresh();
    } catch (error) {
      toast.error(errorToString(error), { id: loadingToastId });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function toggleStatus() {
    const isRejected = listingStatus === LISTING_STATUS.REJECTED;
    const nextStatus: ListingStatusValue = isRejected
      ? LISTING_STATUS.POTENTIAL
      : LISTING_STATUS.REJECTED;

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
      onActionComplete?.();
      router.refresh();
    } catch {
      toast.error('An error occurred while updating status');
    } finally {
      setIsTogglingStatus(false);
    }
  }

  async function deleteListing() {
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
      const result = await deleteListingAction(listingId);
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
      onActionComplete?.();
      router.refresh();
    } catch {
      toast.error('An error occurred while deleting the listing');
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    refresh,
    toggleStatus,
    deleteListing,
    isRefreshing,
    isTogglingStatus,
    isDeleting,
  };
}
