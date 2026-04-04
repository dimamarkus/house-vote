'use client'; // This component needs state, so it must be a client component

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Trip } from 'db';
import { Card, CardHeader, CardTitle, CardDescription } from '@turbodima/ui/shadcn/card';
import { Button } from '@turbodima/ui/core/Button';
import { Input } from '@turbodima/ui/shadcn/input';
import { Label } from '@turbodima/ui/shadcn/label';
import { ListingFormSheet } from '../../listings/forms/ListingFormSheet';
import { importListingFromUrl } from '../../listings/actions/importListingFromUrl';
import { toast } from 'sonner';
import { errorToString } from '@turbodima/core/errors';

interface TripHeaderProps {
  // Use Partial<Trip> again as a workaround for upstream type issues
  trip: Partial<Trip> & Pick<Trip, 'id' | 'name' | 'userId' | 'startDate' | 'endDate' | 'location' | 'numberOfPeople' | 'description'>;
}

export function TripHeader({ trip }: TripHeaderProps) {
  const router = useRouter();
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
      const result = await importListingFromUrl({ url: importUrl, tripId: trip.id });
      toast.dismiss();
      if (result.success) {
        if (!result.data) {
          toast.error('Import finished without any listing data.');
          return;
        }

        router.refresh();
        const missingFields = result.data.missingFields ?? [];
        const successMessage =
          missingFields.length > 0
            ? `Saved "${result.data.listingTitle}". Still missing: ${missingFields.join(', ')}.`
            : `Saved "${result.data.listingTitle}".`;
        toast.success(successMessage);
        setImportUrl('');
      } else {
        toast.error(errorToString(result.error || 'Import failed'));
      }
    } catch (error) {
      toast.dismiss();
      toast.error(errorToString(error));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-row items-start justify-between gap-4">
          <div className="flex-grow">
            <CardTitle>{trip.name}</CardTitle>
            {/* Use optional chaining for description */}
            {trip.description && (
              <CardDescription className="mt-1 text-sm text-muted-foreground">
                {trip.description}
              </CardDescription>
            )}
            <CardDescription className="mt-2 text-sm text-muted-foreground">
              Paste a listing URL for a best-effort Airbnb or VRBO import, or use the browser import token for the richer in-browser parser.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label htmlFor="import-url-header" className="sr-only">Import URL</Label>
              <Input
                id="import-url-header"
                type="url"
                placeholder="Paste listing URL..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                disabled={isImporting}
                className="flex-grow min-w-[200px]"
              />
              <Button
                onClick={handleImport}
                disabled={isImporting || !importUrl}
                size="icon"
                aria-label="Import Listing from URL"
                title="Import Listing from URL"
                icon="link"
              />
            </div>

            <ListingFormSheet tripId={trip.id}>
              <Button weight="hollow" className="w-full sm:w-auto" icon="plus" text="Add Manually"/>
            </ListingFormSheet>

          </div>
        </div>
      </CardHeader>
    </Card>
  );
}