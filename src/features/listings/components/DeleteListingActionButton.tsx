'use client';

import { deleteListing } from '../actions/deleteListing';
import { SingleButtonForm } from '@turbodima/ui/form/SingleButtonForm';
import { Trash2 } from 'lucide-react';

type DeleteListingActionButtonProps = {
  listingId: string;
}

export function DeleteListingActionButton({ listingId }: DeleteListingActionButtonProps) {
  return (
    <SingleButtonForm
      action={() => deleteListing(listingId)}
      buttonIcon={Trash2}
      buttonVariant="destructive"
      buttonSize="sm"
      title="Delete Listing"
      description="This action cannot be undone. This will permanently delete the listing."
      successMessage="Listing deleted successfully"
      errorMessage="Failed to delete listing"
      confirmLabel="Delete"
      confirmVariant="destructive"
    />
  );
}