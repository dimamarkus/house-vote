'use client'; // This component needs state, so it must be a client component

import { useState } from 'react';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Trip } from 'db';
import { Card, CardHeader, CardTitle, CardDescription } from '@turbodima/ui/shadcn/card';
import { Badge } from '@turbodima/ui/shadcn/badge';
import { Button } from '@turbodima/ui/core/Button';
import { Input } from '@turbodima/ui/shadcn/input';
import { Label } from '@turbodima/ui/shadcn/label';
import { ListingFormSheet } from '../../listings/forms/ListingFormSheet';
import { importListingFromUrl } from '../../listings/actions/importListingFromUrl';
import { toast } from 'sonner';
import { errorToString } from '@turbodima/core/errors';
import { formatTripDateRange } from '../utils/formatTripDateRange';

interface TripHeaderProps {
  // Use Partial<Trip> again as a workaround for upstream type issues
  trip: Partial<Trip> & Pick<Trip, 'id' | 'name' | 'userId' | 'startDate' | 'endDate' | 'location' | 'numberOfPeople' | 'description'>;
}

export function TripHeader({ trip }: TripHeaderProps) {
  const router = useRouter();
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const tripDateRange = formatTripDateRange(trip.startDate, trip.endDate);

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
    <Card className="mb-6 overflow-hidden border-border/60 bg-gradient-to-br from-background via-background to-muted/40">
      <CardHeader className="gap-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-5">
            <Badge weight="hollow" className="w-fit">
              Trip
            </Badge>

            <div className="space-y-3">
              <CardTitle className="text-3xl tracking-tight sm:text-4xl">{trip.name}</CardTitle>
              {trip.description ? (
                <CardDescription className="max-w-3xl text-base leading-7 text-muted-foreground">
                  {trip.description}
                </CardDescription>
              ) : null}
            </div>

            {(trip.location || tripDateRange || trip.numberOfPeople) ? (
              <div className="flex flex-wrap gap-3">
                {trip.location ? (
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-sm sm:text-base">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{trip.location}</span>
                  </div>
                ) : null}

                {tripDateRange ? (
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-sm sm:text-base">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span>{tripDateRange}</span>
                  </div>
                ) : null}

                {trip.numberOfPeople ? (
                  <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-sm sm:text-base">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{trip.numberOfPeople} guests</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border bg-background/85 p-4 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Import listing</p>
                <p className="text-sm text-muted-foreground">
                  Paste an Airbnb or Vrbo URL for a quick import, or add a listing manually.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="import-url-header" className="sr-only">
                    Import URL
                  </Label>
                  <Input
                    id="import-url-header"
                    type="url"
                    placeholder="Paste listing URL..."
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    disabled={isImporting}
                    className="min-w-0 flex-1"
                  />
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || !importUrl}
                    aria-label="Import Listing from URL"
                    title="Import Listing from URL"
                    icon="link"
                    text={isImporting ? 'Importing...' : 'Import'}
                    className="shrink-0"
                  />
                </div>

                <ListingFormSheet tripId={trip.id}>
                  <Button weight="hollow" className="w-full" icon="plus" text="Add Manually" />
                </ListingFormSheet>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}