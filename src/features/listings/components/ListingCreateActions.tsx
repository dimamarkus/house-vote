'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { importListingFromUrl } from '@/features/listings/actions/importListingFromUrl';
import { ListingFormSheet } from '@/features/listings/forms/ListingFormSheet';
import { errorToString } from '@/core/errors';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Label } from '@/ui/shadcn/label';
import { cn } from '@/ui/utils/cn';

interface ListingCreateActionsProps {
  tripId: string;
  className?: string;
}

export function ListingCreateActions({
  tripId,
  className,
}: ListingCreateActionsProps) {
  const router = useRouter();
  const inputId = useId();
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!importUrl) {
      toast.error('Please enter a URL.');
      return;
    }

    setIsImporting(true);
    toast.loading('Importing listing...');

    try {
      const result = await importListingFromUrl({ url: importUrl, tripId });

      toast.dismiss();

      if (!result.success) {
        toast.error(errorToString(result.error || 'Import failed'));
        return;
      }

      if (!result.data) {
        toast.error('Import finished without any listing data.');
        return;
      }

      const missingFields = result.data.missingFields ?? [];
      const successMessage =
        missingFields.length > 0
          ? `Saved "${result.data.listingTitle}". Still missing: ${missingFields.join(', ')}.`
          : `Saved "${result.data.listingTitle}".`;

      toast.success(successMessage);
      setImportUrl('');
      router.refresh();
    } catch (error) {
      toast.dismiss();
      toast.error(errorToString(error));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={cn('rounded-xl border bg-muted/20 p-4', className)}>
      <div className="mb-3 space-y-1">
        <p className="text-sm font-medium">Add listings</p>
        <p className="text-sm text-muted-foreground">
          Import from Airbnb or Vrbo, or add a place manually for side-by-side comparison.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <Label htmlFor={inputId} className="sr-only">
            Listing URL
          </Label>
          <Input
            id={inputId}
            type="url"
            placeholder="Paste Airbnb or Vrbo URL..."
            value={importUrl}
            onChange={(event) => setImportUrl(event.target.value)}
            disabled={isImporting}
            className="min-w-0 flex-1 bg-background"
          />
          <Button
            onClick={handleImport}
            disabled={isImporting || !importUrl}
            icon="link"
            text={isImporting ? 'Importing...' : 'Import URL'}
            className="w-full sm:w-auto"
          />
        </div>

        <ListingFormSheet tripId={tripId}>
          <Button weight="hollow" icon="plus" text="Add Manually" className="w-full xl:w-auto" />
        </ListingFormSheet>
      </div>
    </div>
  );
}
