'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form } from '@/ui/form/Form';
import { FormSection } from '@/ui/form/FormSection';
import { InputField } from '@/ui/form/fields/InputField';
import { DatePickerField } from '../../../components/DatePickerField';
import { TextareaField } from '@/ui/form/fields/TextareaField';
import { Button } from '@/ui/shadcn/button';
import { createTrip } from '../actions/createTrip';
import type { TripFormData } from '../schemas';
import { toast } from 'sonner';
import type { Trip } from 'db';
import type { BasicApiResponse } from '@/core/types';
import { cn } from '@/ui/utils/cn';
import {
  DEFAULT_PARTY_UNIT,
  formatPartyUnitCount,
  getPartyUnitLabels,
  normalizePartyUnit,
  type PartyUnit,
} from '../utils/partyUnitLabels';
import { normalizeTripGuestBreakdown } from '../utils/tripTravelContext';

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
  const initialGuestBreakdown = normalizeTripGuestBreakdown({
    adultCount: initialData?.adultCount,
    childCount: initialData?.childCount,
    numberOfPeople: initialData?.numberOfPeople,
    partyUnit: initialData?.partyUnit,
  });

  const formattedInitialData: Partial<Omit<TripFormData, 'startDate' | 'endDate' | 'numberOfPeople' | 'adultCount' | 'childCount' | 'partyUnit'>> & {
    startDate?: Date;
    endDate?: Date;
    numberOfPeople?: string;
    adultCount?: string;
    childCount?: string;
    partyUnit: PartyUnit;
  } = {
    name: initialData?.name ?? '',
    description: initialData?.description ?? undefined,
    location: initialData?.location ?? undefined,
    startDate: initialData?.startDate ? new Date(initialData.startDate) : undefined,
    endDate: initialData?.endDate ? new Date(initialData.endDate) : undefined,
    numberOfPeople: initialGuestBreakdown.numberOfPeople?.toString() ?? '',
    adultCount: initialGuestBreakdown.adultCount?.toString() ?? '',
    childCount: initialGuestBreakdown.childCount?.toString() ?? '',
    partyUnit: initialGuestBreakdown.partyUnit,
  };
  const [partyUnit, setPartyUnit] = useState<PartyUnit>(
    normalizePartyUnit(formattedInitialData.partyUnit ?? DEFAULT_PARTY_UNIT),
  );
  const [partyCountValue, setPartyCountValue] = useState(formattedInitialData.numberOfPeople ?? '');
  const [adultCountValue, setAdultCountValue] = useState(formattedInitialData.adultCount ?? '');
  const [childCountValue, setChildCountValue] = useState(formattedInitialData.childCount ?? '');
  const partyLabels = getPartyUnitLabels(partyUnit);
  const previewPartyCount = normalizeTripGuestBreakdown({
    numberOfPeople: partyCountValue === '' ? null : Number(partyCountValue),
    partyUnit,
  }).numberOfPeople;

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
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Party counted as</p>
              <input type="hidden" name="partyUnit" value={partyUnit} />
              <div
                role="group"
                aria-label="Party unit"
                className="inline-flex w-full gap-1 rounded-xl border bg-background p-1 sm:w-auto"
              >
                <button
                  type="button"
                  onClick={() => setPartyUnit('GUEST')}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none',
                    partyUnit === 'GUEST'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  aria-pressed={partyUnit === 'GUEST'}
                >
                  Guests
                </button>
                <button
                  type="button"
                  onClick={() => setPartyUnit('FAMILY')}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none',
                    partyUnit === 'FAMILY'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  aria-pressed={partyUnit === 'FAMILY'}
                >
                  Families
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Controls labels and the per-{partyLabels.singular} price divider across the trip.
                Adults/children below are only used for Airbnb and Vrbo search links.
              </p>
            </div>

            <InputField
              name="numberOfPeople"
              label={`Number of ${partyLabels.plural} (Optional)`}
              type="number"
              min="1"
              inputMode="numeric"
              placeholder={partyUnit === 'FAMILY' ? 'e.g., 5' : 'e.g., 12'}
              error={formState.fieldErrors?.numberOfPeople?.[0]}
              helperText={`Used as the price divider (total ÷ ${partyLabels.plural}).`}
              defaultValue={formattedInitialData.numberOfPeople ?? ''}
              onChange={(event) => setPartyCountValue(event.currentTarget.value)}
            />
            {previewPartyCount ? (
              <p className="text-sm text-muted-foreground">
                {formatPartyUnitCount(previewPartyCount, partyUnit)}
              </p>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                name="adultCount"
                label="Adults (Optional)"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="e.g., 8"
                error={formState.fieldErrors?.adultCount?.[0]}
                helperText="Used only for Airbnb, Vrbo, and hotel search links."
                defaultValue={formattedInitialData.adultCount ?? ''}
                onChange={(event) => setAdultCountValue(event.currentTarget.value)}
              />
              <InputField
                name="childCount"
                label="Children (Optional)"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="e.g., 4"
                error={formState.fieldErrors?.childCount?.[0]}
                helperText="Used only for Airbnb, Vrbo, and hotel search links."
                defaultValue={formattedInitialData.childCount ?? ''}
                onChange={(event) => setChildCountValue(event.currentTarget.value)}
              />
            </div>
            {(adultCountValue !== '' || childCountValue !== '') && (
              <p className="text-xs text-muted-foreground">
                Search-link headcount:{' '}
                {(Number(adultCountValue) || 0) + (Number(childCountValue) || 0)} people
              </p>
            )}
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
