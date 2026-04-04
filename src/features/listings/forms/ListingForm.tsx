'use client';

/**
 * Note: If using this component with all field types, ensure you have these UI components:
 * - @/ui/form/fields/InputField
 * - @/ui/form/fields/TextareaField
 * - @/ui/form/fields/CheckboxField
 * - @/ui/form/fields/DatePickerField
 * - @/ui/form/fields/SelectField
 *
 * You can remove imports for components you don't use.
 */

import { Button } from '@/ui/shadcn/button';
import { ListingFormValues } from '../schemas';
import { FormSection } from '@/ui/form/FormSection';

import { InputField } from '@/ui/form/fields/InputField';
import { createListing } from '../actions/createListing';
import { updateListing } from '../actions/updateListing';
import { Form } from '@/ui/form/Form';
import { cn } from '@/ui/utils/cn';


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

  // Define form action based on whether this is create or edit
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

        <InputField
          name="address"
          label="Address (Optional)"
          placeholder="Enter address"
          defaultValue={initialState?.address || ''}
        />
      </FormSection>

      <FormSection className="mb-6">
        <div className="grid grid-cols-3 gap-4">
          <InputField
            name="bathroomCount"
            label="Bathrooms"
            type="number"
            placeholder="Enter bathroom count"
            defaultValue={initialState?.bathroomCount?.toString() || ''}
          />

          <InputField
            name="bedCount"
            label="Beds"
            type="number"
            placeholder="Enter bed count"
            defaultValue={initialState?.bedCount?.toString() || ''}
          />

          <InputField
            name="bedroomCount"
            label="Bedrooms"
            type="number"
            placeholder="Enter bedroom count"
            defaultValue={initialState?.bedroomCount?.toString() || ''}
          />
        </div>
      </FormSection>

      <FormSection className="mb-6">
        <InputField
          name="imageUrl"
          label="Image Url"
          placeholder="Enter image url"
          defaultValue={initialState?.imageUrl || ''}
          type="url"
        />

        <InputField
          name="notes"
          label="Notes"
          placeholder="Enter notes"
          defaultValue={initialState?.notes || ''}
        />

        <InputField
          name="price"
          label="Price"
          type="number"
          placeholder="Enter price"
          defaultValue={initialState?.price?.toString() || ''}
          step="0.01"
        />

        <InputField
          name="url"
          label="Url"
          placeholder="Enter url"
          defaultValue={initialState?.url || ''}
          type="url"
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