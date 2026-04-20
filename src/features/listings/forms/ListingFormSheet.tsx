'use client';

import { useState } from 'react';
import { Button } from '@/ui/shadcn/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/ui/shadcn/sheet';
import { Edit } from 'lucide-react';
import { ListingForm } from './ListingForm';
import { ListingFormValues } from '../schemas';

/**
 * Props for the Listing form sheet component
 */
interface ListingFormSheetProps {
  /** ID of the listing to edit (if in edit mode) */
  listingId?: string;
  /** The Trip ID this listing belongs to */
  tripId: string;
  /** Initial state for the form fields - should match ListingForm */
  initialState?: ListingFormValues;
  /** Custom label for the trigger button */
  children?: React.ReactNode;
  /** Side from which the sheet appears */
  side?: "top" | "right" | "bottom" | "left";
  /** Controlled open state. When provided, children/trigger are optional. */
  open?: boolean;
  /** Controlled open-state change handler. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Sheet wrapper for Listing form
 * Provides a slide-in interface for creating or editing listings
 *
 * @component
 */
export function ListingFormSheet({
  listingId,
  initialState,
  children,
  side = "right",
  tripId,
  open: controlledOpen,
  onOpenChange,
}: ListingFormSheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = typeof controlledOpen === 'boolean';
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  const isEditing = !!listingId;

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {isControlled && !children ? null : (
        <SheetTrigger asChild>
          {/* Render children if provided, otherwise default button */}
          {children ? children : (
            <Button
              variant="primary"
              weight={isEditing ? "ghost" : "solid"}
              size={isEditing ? "icon" : "default"}>
              {isEditing ? <Edit className="h-4 w-4" /> : 'Add Listing'}
            </Button>
          )}
        </SheetTrigger>
      )}
      <SheetContent side={side} className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Listing' : 'Create Listing'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the listing details below'
              : 'Fill in the details to create a new listing'}
          </SheetDescription>
        </SheetHeader>

        <ListingForm
          className="p-4"
          listingId={listingId}
          initialState={initialState}
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
          tripId={tripId}
        />
      </SheetContent>
    </Sheet>
  );
}