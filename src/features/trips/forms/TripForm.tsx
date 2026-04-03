'use client';

import { useRouter } from 'next/navigation';
import { Form } from '@turbodima/ui/form/Form';
import { FormSection } from '@turbodima/ui/form/FormSection';
import { InputField } from '@turbodima/ui/form/fields/InputField';
import { DatePickerField } from '../../../components/DatePickerField';
import { TextareaField } from '@turbodima/ui/form/fields/TextareaField';
import { Button } from '@turbodima/ui/shadcn/button';
import { createTrip } from '../actions/createTrip';
import type { TripFormData } from '../schemas';
import { toast } from 'sonner';
import type { Trip } from 'db';
import type { BasicApiResponse } from '@turbodima/core/types';

interface TripFormProps {
  initialData?: Partial<TripFormData>;
  tripId?: string;
  boundUpdateAction?: (formData: FormData) => Promise<BasicApiResponse<Trip>>;
  onSuccess?: () => void;
}

export function TripForm({
  initialData,
  tripId,
  boundUpdateAction,
  onSuccess,
}: TripFormProps) {
  const router = useRouter();
  const isEditing = !!tripId;

  const actionToUse = isEditing ? boundUpdateAction : createTrip;

  const formattedInitialData: Partial<Omit<TripFormData, 'startDate' | 'endDate' | 'numberOfPeople'>> & { startDate?: Date; endDate?: Date; numberOfPeople?: string } = {
    name: initialData?.name ?? '',
    description: initialData?.description ?? undefined,
    location: initialData?.location ?? undefined,
    startDate: initialData?.startDate ? new Date(initialData.startDate) : undefined,
    endDate: initialData?.endDate ? new Date(initialData.endDate) : undefined,
    numberOfPeople: initialData?.numberOfPeople?.toString() ?? '',
  };

  if (!actionToUse && isEditing) {
    console.error("boundUpdateAction is required when editing a trip.");
    return <p className='text-destructive'>Configuration error: Cannot update trip.</p>;
  }

  return (
    <Form<TripFormData>
      action={actionToUse!}
      onSuccess={(result) => {
        if (result.success) {
          const tripName = (result.data as Trip).name;
          toast.success(
            `Trip "${tripName}" has been successfully ${isEditing ? 'updated' : 'created'}.`
          );
          onSuccess?.();
          if (isEditing) {
            router.push(`/trips/${tripId}`);
          } else {
            router.push('/trips');
          }
          router.refresh();
        } else if (!result.success && typeof result.error === 'string') {
          toast.error(result.error);
        }
      }}
      className="space-y-4"
    >
      {(formState) => (
        <>
          <FormSection>
            <InputField
              name="name"
              label="Trip Name"
              required
              placeholder="e.g., Summer House Hunt 2025"
              error={formState.fieldErrors?.name?.[0]}
              defaultValue={formattedInitialData.name ?? ''}
            />
            <TextareaField
              name="description"
              label="Description (Optional)"
              placeholder="Notes about the trip, goals, etc."
              rows={3}
              error={formState.fieldErrors?.description?.[0]}
              defaultValue={formattedInitialData.description ?? ''}
            />
            <InputField
              name="location"
              label="Location (Optional)"
              placeholder="e.g., Outer Banks, NC"
              error={formState.fieldErrors?.location?.[0]}
              defaultValue={formattedInitialData.location ?? ''}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePickerField
                name="startDate"
                label="Start Date (Optional)"
                error={formState.fieldErrors?.startDate?.[0]}
                defaultValue={formattedInitialData.startDate}
              />
              <DatePickerField
                name="endDate"
                label="End Date (Optional)"
                error={formState.fieldErrors?.endDate?.[0]}
                defaultValue={formattedInitialData.endDate}
              />
              <InputField
                name="numberOfPeople"
                label="Number of People (Optional)"
                type="number"
                min="1"
                placeholder="e.g., 8"
                error={formState.fieldErrors?.numberOfPeople?.[0]}
                defaultValue={formattedInitialData.numberOfPeople ?? ''}
              />
            </div>
            {formState.fieldErrors?.endDate && !formState.fieldErrors.startDate && formState.fieldErrors.endDate[0]?.includes('End date must be on or after start date') && (
                <p className="text-sm text-destructive">{formState.fieldErrors.endDate[0]}</p>
            )}
          </FormSection>

          {typeof formState.error === 'string' && (
            <p className="text-sm text-destructive">{formState.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              weight="hollow"
              onClick={() => router.push(isEditing ? `/trips/${tripId}` : '/trips')}
              disabled={!!formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!!formState.isSubmitting}>
              {formState.isSubmitting
                ? isEditing ? 'Updating...' : 'Creating...'
                : isEditing ? 'Update Trip' : 'Create Trip'}
            </Button>
          </div>
        </>
      )}
    </Form>
  );
}