'use client';

import { useState } from 'react';
import { Button } from '@turbodima/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@turbodima/ui/shadcn/dialog';
import { Pencil, Plus } from 'lucide-react';
import { ListingFormData } from '../schemas';
import { ListingForm } from './ListingFormOLD';

/**
 * Props for the Listing form dialog component
 */
interface ListingFormDialogProps {
  /** ID of the listing to edit (if in edit mode) */
  listingId?: string;
  /** Trip ID for the listing */
  tripId: string;
  /** Initial state for the form fields */
  initialState?: Partial<ListingFormData>;
  /** Custom label for the trigger button */
  triggerLabel?: string;
  /** Custom description text for the dialog */
  description?: string;
}

/**
 * Dialog wrapper for Listing form
 * Provides a modal interface for creating or editing listings
 *
 * @component
 */
export function ListingFormDialog({
  listingId,
  tripId,
  initialState,
  triggerLabel,
  description
}: ListingFormDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditing = !!listingId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="primary"
          weight={isEditing ? "hollow" : "solid"}
          size={isEditing ? "sm" : "default"}>
          {isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4 mr-2" />}
          {isEditing ? '' : triggerLabel || `Add Listing`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit Listing` : `Create Listing`}</DialogTitle>
          <DialogDescription>
            {description || (isEditing
              ? `Update the listing details below`
              : `Fill in the details to create a new listing`)}
          </DialogDescription>
        </DialogHeader>

        <ListingForm
          listingId={listingId}
          tripId={tripId}
          initialState={initialState}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}