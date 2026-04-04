'use client';

import type { ReactNode } from 'react';
import { deleteListing } from '../actions/deleteListing';
import { SingleButtonForm } from '@turbodima/ui/form/SingleButtonForm';
import { Trash2 } from 'lucide-react';
import type { ButtonSize, ButtonVariant, ButtonWeight } from '@turbodima/ui/shadcn/button';

type DeleteListingActionButtonProps = {
  listingId: string;
  listingTitle?: string;
  buttonClassName?: string;
  buttonSize?: ButtonSize;
  buttonText?: ReactNode;
  buttonVariant?: ButtonVariant;
  buttonWeight?: ButtonWeight;
  description?: string;
  title?: string;
}

export function DeleteListingActionButton({
  listingId,
  listingTitle,
  buttonClassName,
  buttonSize = 'sm',
  buttonText,
  buttonVariant = 'destructive',
  buttonWeight = 'ghost',
  description,
  title = 'Delete Listing',
}: DeleteListingActionButtonProps) {
  const resolvedDescription =
    description ??
    (listingTitle
      ? `Are you sure you want to delete listing "${listingTitle}"? This cannot be undone.`
      : 'This action cannot be undone. This will permanently delete the listing.');

  const resolvedSuccessMessage = listingTitle
    ? `${listingTitle} deleted successfully.`
    : 'Listing deleted successfully';

  const resolvedErrorMessage = listingTitle
    ? `Failed to delete ${listingTitle}.`
    : 'Failed to delete listing';

  return (
    <SingleButtonForm
      action={() => deleteListing(listingId)}
      buttonClassName={buttonClassName}
      buttonIcon={Trash2}
      buttonSize={buttonSize}
      buttonText={buttonText}
      buttonVariant={buttonVariant}
      buttonWeight={buttonWeight}
      title={title}
      description={resolvedDescription}
      successMessage={resolvedSuccessMessage}
      errorMessage={resolvedErrorMessage}
      confirmLabel="Delete"
      confirmVariant="destructive"
    />
  );
}