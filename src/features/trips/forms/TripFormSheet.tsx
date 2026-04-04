'use client';

import { useState } from 'react';
import { Button } from '@/ui/core/Button';
import type { ButtonProps } from '@/ui/core/Button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/ui/shadcn/sheet';
import { TripFormData } from '../schemas'; // Assuming schemas exist
import { TripForm } from './TripForm';
import { TripImportTokenCard } from '../components/TripImportTokenCard';
import { updateTrip } from '../actions/updateTrip'; // Import the update action

/**
 * Props for the Trip form sheet component (for editing)
 */
interface TripFormSheetProps {
  /** ID of the trip to edit */
  tripId: string;
  /** Initial state for the form fields */
  initialData?: TripFormData; // Make optional, but usually provided for edits
  /** Custom label for the trigger button */
  triggerLabel?: string;
  /** Trigger icon */
  triggerIcon?: ButtonProps['icon'];
  /** Trigger size */
  triggerSize?: ButtonProps['size'];
  /** Trigger weight */
  triggerWeight?: ButtonProps['weight'];
  /** Trigger class name */
  triggerClassName?: string;
  /** Side from which the sheet appears */
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Sheet wrapper for Trip form, primarily for editing trip settings.
 *
 * @component
 */
export function TripFormSheet({
  tripId,
  initialData,
  triggerLabel = 'Edit',
  triggerIcon = 'settings',
  triggerSize = 'sm',
  triggerWeight = 'link',
  triggerClassName,
  side = "right",
}: TripFormSheetProps) {
  const [open, setOpen] = useState(false);

  // Create the bound action for the update operation
  const boundUpdate = updateTrip.bind(null, tripId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          weight={triggerWeight}
          icon={triggerIcon}
          text={triggerLabel}
          size={triggerSize}
          className={triggerClassName}
        />
      </SheetTrigger>
      <SheetContent side={side} className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Trip Settings</SheetTitle>
          <SheetDescription>
            Update the trip details below.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4">
          <TripForm
            tripId={tripId} // Pass tripId for update action
            boundUpdateAction={boundUpdate} // Pass the bound update action
            initialData={initialData}
            onSuccess={() => setOpen(false)}
          />
        </div>

        <div className="border-t pt-6">
          <TripImportTokenCard tripId={tripId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}