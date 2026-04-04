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
import { ListingFormData } from '../schemas';
import { FormSection } from '@/ui/form/FormSection';
import { InputField } from '@/ui/form/fields/InputField';
import { TextareaField } from '@/ui/form/fields/TextareaField';
import { createListing } from '../actions/createListing';
import { updateListing } from '../actions/updateListing';
import { Form } from '@/ui/form/Form';
import { cn } from '@/ui/utils/cn';
import { useState } from 'react';
import { toast } from 'sonner';
import { Label } from '@/ui/shadcn/label';
import { Input } from '@/ui/shadcn/input';
import { fetchListingMetadata } from '../actions/fetchListingMetadata';
import { FormError } from '@/ui/form/FormError';

// Define a type for the fetched metadata to avoid potential conflicts
// Allow imageUrl to be null or undefined in FetchedMetadata
type FetchedMetadata = Partial<Omit<ListingFormData, 'url' | 'imageUrl'> & { imageUrl?: string | null }>;

interface ListingFormProps {
  className?: string;
  listingId?: string;
  tripId: string;
  initialState?: Partial<ListingFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Core form component for Listing data
 * Handles both create and update operations with progressive enhancement
 * Displays form and field level errors.
 *
 * @component
 */
export function ListingForm({
  className,
  listingId,
  tripId,
  initialState,
  onSuccess,
  onCancel,
}: ListingFormProps) {
  const isEditing = !!listingId;
  const [urlInputValue, setUrlInputValue] = useState(initialState?.url || '');
  const [isImporting, setIsImporting] = useState(false);
  // FetchedData holds data from URL import *before* form submission merges it
  const [fetchedData, setFetchedData] = useState<FetchedMetadata>({});
  // Force re-render ONLY after successful import or successful submit
  const [formKey, setFormKey] = useState(() => `initial-${listingId || 'new'}`);

  // Combine initial state and fetched data for defaultValues
  // This primarily affects the *initial* render after a key change
  const currentDefaultValues = {
      ...initialState,
      ...fetchedData,
      url: urlInputValue || initialState?.url || '', // URL always reflects input/initial
  };

  const handleImport = async () => {
    if (!urlInputValue) {
      toast.error('Please enter a URL to import.');
      return;
    }
    setIsImporting(true);
    toast.info('Attempting to fetch listing info...');
    let importSuccess = false; // Track success to decide on key change
    try {
      const result = await fetchListingMetadata({ url: urlInputValue });
      if (result?.data) {
        toast.success('Fetched info! Please review and complete the form.');
        setFetchedData({ // Store fetched data separately
          address: result.data.address || '',
          price: result.data.price || undefined,
          notes: result.data.notes || '',
          imageUrl: result.data.imageUrl ?? undefined,
          // Do not set URL here, it's controlled by urlInputValue
        });
        importSuccess = true; // Mark import as successful
      } else {
        toast.error(result?.error || 'Could not fetch info from URL. Please enter manually.');
        setFetchedData({}); // Clear any previously fetched data on error
      }
    } catch (error) {
      toast.error('An error occurred during import. Please enter manually.');
      console.error('Import error:', error);
      setFetchedData({}); // Clear any previously fetched data on error
    } finally {
      setIsImporting(false);
      // ONLY change key if import was successful to trigger form reset with fetched data
      if (importSuccess) {
        setFormKey(`fetched-${Date.now()}`);
      }
    }
  };

  const handleFormAction = (formData: FormData) => {
    if (!formData.has('tripId')) {
      formData.set('tripId', tripId);
    }
    // Ensure the correct URL from state is set
    formData.set('url', urlInputValue);
    // Ensure imageUrl from fetchedData (if any) is included
    // Use currentDefaultValues to ensure we grab the correct imageUrl
    if (currentDefaultValues.imageUrl) {
      formData.set('imageUrl', currentDefaultValues.imageUrl);
    }

    if (isEditing && listingId) {
      return updateListing(listingId, formData);
    }
    return createListing(formData);
  };

  return (
    <Form
      action={handleFormAction}
      className={cn("space-y-4", className)}
      successMessage={isEditing ? "Listing updated successfully" : "Listing created successfully"}
      errorMessage={isEditing ? "Failed to update listing" : "Failed to create listing"}
      // Reset form only on successful *creation*. On edits, keep values.
      resetOnSuccess={!isEditing}
      onSuccess={(response) => { // Modify onSuccess to check response
        // Check if the action was ACTUALLY successful before resetting
        if (response?.success) {
            setFetchedData({}); // Clear fetched data after success
            setUrlInputValue(''); // Clear URL input after success
            setFormKey(`success-${Date.now()}`); // Reset key ONLY on true success
            onSuccess?.(); // Call original onSuccess callback
        }
        // Do nothing if response indicates failure (error handled by Form component)
      }}
      id={`listing-form-${listingId || 'new'}`}
      // Use the key to force re-render with new defaults after successful import/creation
      key={formKey}
      // Enable form persistence (optional, good for complex forms)
      // persistence={{ enabled: true }}
    >
      {(state) => { // Use render prop to access form state
        // Calculate boolean for aria-invalid explicitly
        const hasUrlError = !!(state.fieldErrors?.url && state.fieldErrors.url.length > 0);

        return (
          <>
            {/* Display form errors (will show concatenated string if fieldErrors is empty) */}
            <FormError state={state} />

            {/* Moved URL Input and Fetch Button to the top */}
            {!isEditing && (
              <div className="flex items-end gap-2 mb-6 border-b pb-4">
                <div className="flex-grow space-y-2">
                  <Label htmlFor="url-input">Airbnb or Vrbo URL (Optional)</Label>
                  <Input
                    id="url-input"
                    name="url" // Use 'url' as the name
                    type="url"
                    value={urlInputValue} // Controlled component
                    onChange={(e) => setUrlInputValue(e.target.value)}
                    placeholder="Paste URL here..."
                    disabled={isImporting}
                    // Display URL field error if present
                    aria-invalid={hasUrlError}
                    aria-describedby={state.fieldErrors?.url ? "url-error" : undefined}
                  />
                  {state.fieldErrors?.url && (
                    <p id="url-error" className="text-sm text-destructive">{state.fieldErrors.url[0]}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Paste a link to attempt pre-filling details.</p>
                </div>
                <Button onClick={handleImport} disabled={isImporting || !urlInputValue}>
                  {isImporting ? 'Fetching...' : 'Fetch Info'}
                </Button>
              </div>
            )}

            {/* Hidden fields needed for submission */}
            <input type="hidden" name="tripId" value={tripId} />
            {/* Use defaultValue from calculated defaults */}
            {(currentDefaultValues.imageUrl) && (
              <input type="hidden" name="imageUrl" value={currentDefaultValues.imageUrl} />
            )}

            <FormSection title="Listing Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  name="address"
                  label="Address / Name"
                  required
                  placeholder="e.g., 123 Main St or Ocean View Condo"
                  // Use defaultValue from combined state
                  defaultValue={currentDefaultValues.address || ''}
                  error={state.fieldErrors?.address?.[0]} // Display field error
                  helperText="Primary identifier for the listing."
                  className="md:col-span-2"
                />

                <InputField
                  name="price"
                  label="Price (Optional)"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9.]*"
                  placeholder="e.g., 350"
                  // Use defaultValue from combined state
                  defaultValue={currentDefaultValues.price?.toString() || ''}
                  error={state.fieldErrors?.price?.[0]} // Display field error
                  helperText="Nightly rate or total estimate."
                  step="any"
                  min="0"
                />

                <InputField
                  name="bedroomCount"
                  label="Bedrooms (Optional)"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g., 3"
                  // Use defaultValue from combined state
                  defaultValue={currentDefaultValues.bedroomCount?.toString() || ''}
                  error={state.fieldErrors?.bedroomCount?.[0]} // Display field error
                  min="0"
                />
                <InputField
                  name="bedCount"
                  label="Total Beds (Optional)"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g., 5"
                  // Use defaultValue from combined state
                  defaultValue={currentDefaultValues.bedCount?.toString() || ''}
                  error={state.fieldErrors?.bedCount?.[0]} // Display field error
                  min="0"
                />
                <InputField
                  name="bathroomCount"
                  label="Bathrooms (Optional)"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9.]*"
                  placeholder="e.g., 2.5"
                  // Use defaultValue from combined state
                  defaultValue={currentDefaultValues.bathroomCount?.toString() || ''}
                  error={state.fieldErrors?.bathroomCount?.[0]} // Display field error
                  step="0.5"
                  min="0"
                />

                <TextareaField
                  name="notes"
                  label="Notes (Optional)"
                  placeholder="Add any relevant details, pros/cons..."
                  // Use defaultValue from combined state
                  defaultValue={currentDefaultValues.notes || ''}
                  error={state.fieldErrors?.notes?.[0]} // Display field error
                  rows={4}
                  className="md:col-span-2"
                />
              </div>
            </FormSection>

            <div className="flex justify-end gap-2 pt-4">
              {onCancel && (
                <Button weight="hollow" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={!!state.isSubmitting}>
                {state.isSubmitting ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Listing' : 'Add Listing')}
              </Button>
            </div>
          </>
        );
      }}
    </Form>
  );
}