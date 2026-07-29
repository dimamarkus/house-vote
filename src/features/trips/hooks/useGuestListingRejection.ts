'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  rejectPublishedTripListing,
  unrejectPublishedTripListing,
} from '@/features/trips/actions/publishedTripActions';
import { usePublishedTripGuest } from '@/features/trips/components/PublishedTripGuestContext';

interface UseGuestListingRejectionArgs {
  listingId: string;
  /** Fired after a successful reject/restore refresh (e.g. to close a dropdown). */
  onActionComplete?: () => void;
}

export interface UseGuestListingRejectionResult {
  isRejectDialogOpen: boolean;
  setRejectDialogOpen: (open: boolean) => void;
  /** Submits a rejection with the given reason. Resolves true on success. */
  confirmReject: (reason: string) => Promise<boolean>;
  restore: () => Promise<void>;
  isPending: boolean;
}

/**
 * Guest-side reject/restore flow, shared by the dropdown menu and the
 * voting-mode footer so both entry points behave identically. Pulls the token
 * and active guest from context; the caller only supplies the listing id.
 */
export function useGuestListingRejection({
  listingId,
  onActionComplete,
}: UseGuestListingRejectionArgs): UseGuestListingRejectionResult {
  const { token, activeGuest } = usePublishedTripGuest();
  const router = useRouter();
  const [isRejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function confirmReject(reason: string): Promise<boolean> {
    setIsPending(true);
    try {
      const result = await rejectPublishedTripListing({
        token,
        guestId: activeGuest.id,
        listingId,
        reason,
      });
      if (!result.success) {
        toast.error(typeof result.error === 'string' ? result.error : 'Unable to reject this house.');
        return false;
      }
      toast.success('House rejected.');
      onActionComplete?.();
      router.refresh();
      return true;
    } finally {
      setIsPending(false);
    }
  }

  async function restore() {
    setIsPending(true);
    try {
      const result = await unrejectPublishedTripListing({
        token,
        guestId: activeGuest.id,
        listingId,
      });
      if (!result.success) {
        toast.error(typeof result.error === 'string' ? result.error : 'Unable to restore this house.');
        return;
      }
      toast.success('House restored.');
      onActionComplete?.();
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return {
    isRejectDialogOpen,
    setRejectDialogOpen,
    confirmReject,
    restore,
    isPending,
  };
}
