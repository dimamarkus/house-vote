'use client';

import { useState, type FormEvent } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/shadcn/dialog';
import { Textarea } from '@/ui/shadcn/textarea';

const MAX_REASON_LENGTH = 500;

interface RejectListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the trimmed reason. Should return true on success so the dialog can close/reset. */
  onConfirm: (reason: string) => Promise<boolean> | boolean;
  listingTitle?: string;
  isSubmitting?: boolean;
}

/**
 * Shared "reject a house, with a required reason" dialog. Used by both the
 * owner/collaborator admin menu and the guest-facing public controls, so the
 * reason-capture UX stays identical everywhere.
 */
export function RejectListingDialog({
  open,
  onOpenChange,
  onConfirm,
  listingTitle,
  isSubmitting = false,
}: RejectListingDialogProps) {
  const [reason, setReason] = useState('');
  const trimmedReason = reason.trim();

  // Reset the draft as the dialog closes so each open starts blank, without
  // reaching for a state-syncing effect.
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setReason('');
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedReason || isSubmitting) {
      return;
    }

    const succeeded = await onConfirm(trimmedReason);
    if (succeeded) {
      handleOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject this house</DialogTitle>
          <DialogDescription>
            {listingTitle
              ? `Let everyone know why "${listingTitle}" is out. This removes it from voting and clears its votes.`
              : 'Let everyone know why this house is out. This removes it from voting and clears its votes.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this house being rejected?"
            maxLength={MAX_REASON_LENGTH}
            disabled={isSubmitting}
            className="min-h-24"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">{trimmedReason.length}/{MAX_REASON_LENGTH}</p>
          <DialogFooter>
            <Button
              type="button"
              weight="hollow"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || trimmedReason.length === 0}>
              {isSubmitting ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting
                </>
              ) : (
                'Reject house'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
