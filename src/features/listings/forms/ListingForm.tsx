'use client';

import { ListingType } from 'db';
import { Button } from '@/ui/shadcn/button';
import { ListingFormValues } from '../schemas';
import { FormSection } from '@/ui/form/FormSection';
import { InputField } from '@/ui/form/fields/InputField';
import { SelectField, type SelectOption } from '@/ui/form/fields/SelectField';
import { TextareaField } from '@/ui/form/fields/TextareaField';
import { createListing } from '../actions/createListing';
import { updateListing } from '../actions/updateListing';
import { Form } from '@/ui/form/Form';
import { cn } from '@/ui/utils/cn';

// Human-readable labels for the ListingType enum. Kept next to the form because
// that's currently the only place ListingType options are rendered; move to a
// shared module if/when other surfaces need the same labels.
const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  HOUSE: 'House',
  HOTEL: 'Hotel',
  APARTMENT: 'Apartment',
  CABIN: 'Cabin',
  RESORT: 'Resort',
  OTHER: 'Other',
};

const LISTING_TYPE_OPTIONS: ReadonlyArray<SelectOption> = Object.values(ListingType).map(
  (value) => ({ value, label: LISTING_TYPE_LABELS[value] }),
);

interface ListingFormProps {
  className?: string;
  listingId?: string;
  tripId?: string;
  initialState?: ListingFormValues;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Core form component for Listing data
 * Handles both create and update operations with progressive enhancement
 *
 * @component
 */
export function ListingForm({
  className,
  listingId,
  initialState,
  onSuccess,
  onCancel,
  tripId,
}: ListingFormProps) {
  const isEditing = !!listingId;

  const handleFormAction = async (formData: FormData) => {
    if (isEditing && listingId) {
      return updateListing(listingId, formData);
    }
    return createListing(formData);
  };

  return (
    <Form
      action={handleFormAction}
      className={cn("space-y-4 px-4", className)}
      successMessage={isEditing ? "Listing updated successfully" : "Listing created successfully"}
      errorMessage={isEditing ? "Failed to update listing" : "Failed to create listing"}
      resetOnSuccess={!isEditing}
      onSuccess={onSuccess}
      id="listing-form"
    >
      <FormSection className="mb-6">
        <InputField
          name="title"
          label="Title"
          required
          placeholder="Listing title (e.g., from Airbnb)"
          defaultValue={initialState?.title || ''}
        />

        <SelectField
          name="listingType"
          label="Type"
          options={LISTING_TYPE_OPTIONS}
          defaultValue={initialState?.listingType ?? ListingType.HOUSE}
        />

        <InputField
          name="url"
          label="URL"
          placeholder="https://"
          defaultValue={initialState?.url || ''}
          type="url"
        />

        <InputField
          name="address"
          label="Address (Optional)"
          placeholder="Enter address"
          defaultValue={initialState?.address || ''}
        />

        <InputField
          name="imageUrl"
          label="Image URL"
          placeholder="https://"
          defaultValue={initialState?.imageUrl || ''}
          type="url"
        />
      </FormSection>

      <FormSection className="mb-6">
        <InputField
          name="price"
          label="Nightly Price"
          type="number"
          min="0"
          step="1"
          placeholder="Enter nightly price"
          defaultValue={initialState?.price?.toString() || ''}
        />

        <div className="grid grid-cols-3 gap-4">
          <InputField
            name="bedroomCount"
            label="Bedrooms"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 2"
            defaultValue={initialState?.bedroomCount?.toString() || ''}
          />

          <InputField
            name="bedCount"
            label="Beds"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 3"
            defaultValue={initialState?.bedCount?.toString() || ''}
          />

          <InputField
            name="bathroomCount"
            label="Bathrooms"
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 2"
            defaultValue={initialState?.bathroomCount?.toString() || ''}
          />
        </div>
      </FormSection>

      <FormSection className="mb-6">
        <TextareaField
          name="sourceDescription"
          label="Description"
          placeholder="Paste the listing's description, or add your own"
          defaultValue={initialState?.sourceDescription || ''}
          rows={4}
        />

        <TextareaField
          name="notes"
          label="Notes"
          placeholder="Private notes for your trip (not shown on the source)"
          defaultValue={initialState?.notes || ''}
          rows={3}
        />
      </FormSection>

      <input type="hidden" name="tripId" value={tripId || initialState?.tripId || ''}/>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button weight="hollow" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit">
          {isEditing ? 'Update' : 'Create'} Listing
        </Button>
      </div>
    </Form>
  );
}
