'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updatePublishedTripListingDetails } from '@/features/trips/actions/publishedTripActions';
import type { PublishedTripGuestRecord, PublishedTripListingRecord } from '@/features/trips/publishedDb';
import {
  buildInitialValues,
  parseNumberField,
  type PublishedListingFormValues,
} from '@/features/trips/utils/publishedListingForm';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Label } from '@/ui/shadcn/label';
import { Textarea } from '@/ui/shadcn/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/ui/shadcn/sheet';

interface PublishedListingEditSheetProps {
  token: string;
  listing: PublishedTripListingRecord;
  activeGuest: PublishedTripGuestRecord | null;
  children?: React.ReactNode;
  /** Controlled open state. When provided, children is optional. */
  open?: boolean;
  /** Controlled open-state change handler. */
  onOpenChange?: (open: boolean) => void;
}

export function PublishedListingEditSheet({
  token,
  listing,
  activeGuest,
  children,
  open: controlledOpen,
  onOpenChange,
}: PublishedListingEditSheetProps) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = typeof controlledOpen === 'boolean';
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const [values, setValues] = useState<PublishedListingFormValues>(() => buildInitialValues(listing));
  const [prevOpen, setPrevOpen] = useState(open);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Re-seed form values from the latest server-provided listing whenever the
  // sheet transitions to open. Using the "store previous prop" pattern
  // (https://react.dev/reference/react/useState#storing-information-from-previous-renders)
  // avoids set-state-in-effect.
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setValues(buildInitialValues(listing));
    }
  }

  function setOpen(next: boolean) {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeGuest) {
      toast.error('Pick your name first to edit this listing.');
      return;
    }

    const price = parseNumberField(values.price);
    const bedroomCount = parseNumberField(values.bedroomCount);
    const bedCount = parseNumberField(values.bedCount);
    const bathroomCount = parseNumberField(values.bathroomCount);

    if (
      price === undefined ||
      bedroomCount === undefined ||
      bedCount === undefined ||
      bathroomCount === undefined
    ) {
      toast.error('Number fields must be whole numbers.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updatePublishedTripListingDetails({
        token,
        guestId: activeGuest.id,
        listingId: listing.id,
        price,
        bedroomCount,
        bedCount,
        bathroomCount,
        notes: values.notes.trim() === '' ? null : values.notes.trim(),
      });

      if (!result.success) {
        toast.error(typeof result.error === 'string' ? result.error : 'Unable to update listing.');
        return;
      }

      toast.success('Listing updated.');
      setOpen(false);
      router.refresh();
    } catch {
      toast.error('Unable to update listing.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children ? <SheetTrigger asChild>{children}</SheetTrigger> : null}
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit listing details</SheetTitle>
          <SheetDescription>
            Correct shared details everyone voting can see. Changes are visible to all guests.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="pl-edit-price">Price (total stay)</Label>
            <Input
              id="pl-edit-price"
              inputMode="numeric"
              type="number"
              min={0}
              step="1"
              value={values.price}
              onChange={(event) => setValues((prev) => ({ ...prev, price: event.target.value }))}
              placeholder="e.g. 2400"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pl-edit-bedrooms">Rooms</Label>
              <Input
                id="pl-edit-bedrooms"
                inputMode="numeric"
                type="number"
                min={0}
                step="1"
                value={values.bedroomCount}
                onChange={(event) => setValues((prev) => ({ ...prev, bedroomCount: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl-edit-beds">Beds</Label>
              <Input
                id="pl-edit-beds"
                inputMode="numeric"
                type="number"
                min={0}
                step="1"
                value={values.bedCount}
                onChange={(event) => setValues((prev) => ({ ...prev, bedCount: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl-edit-baths">Baths</Label>
              <Input
                id="pl-edit-baths"
                inputMode="numeric"
                type="number"
                min={0}
                step="1"
                value={values.bathroomCount}
                onChange={(event) => setValues((prev) => ({ ...prev, bathroomCount: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pl-edit-notes">Notes</Label>
            <Textarea
              id="pl-edit-notes"
              value={values.notes}
              onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Anything worth flagging for the group"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" weight="hollow" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !activeGuest}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
