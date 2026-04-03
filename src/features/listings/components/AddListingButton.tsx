'use client';

import { ListingFormDialog } from '../forms/ListingFormDialog';

interface AddListingButtonProps {
  tripId: string;
}

/**
 * Button component for adding a new listing to a trip
 *
 * @component
 */
export function AddListingButton({ tripId }: AddListingButtonProps) {
  return (
    <ListingFormDialog
      tripId={tripId}
      triggerLabel="Add Listing"
      description="Add a new property listing to this trip"
    />
  );
}