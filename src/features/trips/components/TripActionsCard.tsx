'use client';

import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Trip } from 'db';
import { toast } from 'sonner';
import { Button } from '@/ui/core/Button';
import { LinkButton } from '@/ui/core/LinkButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { Input } from '@/ui/shadcn/input';
import { Label } from '@/ui/shadcn/label';
import { errorToString } from '@/core/errors';
import { AirbnbIcon, VrboIcon } from '../../../components/TravelSourceIcons';
import { ListingFormSheet } from '../../listings/forms/ListingFormSheet';
import { importListingFromUrl } from '../../listings/actions/importListingFromUrl';

interface TripActionsCardProps {
  trip: Pick<Trip, 'id' | 'location'>;
  airbnbUrl: string;
  vrboUrl: string;
}

export function TripActionsCard({ trip, airbnbUrl, vrboUrl }: TripActionsCardProps) {
  const router = useRouter();
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const canSearchTravelSites = Boolean(trip.location);

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
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle>Trip Actions</CardTitle>
        <CardDescription>
          Search travel sites or add listings to compare on this trip.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Search travel sites</p>
          </div>

          {canSearchTravelSites ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <LinkButton
                href={airbnbUrl}
                target="_blank"
                weight="hollow"
                className="justify-start rounded-xl border-rose-200 bg-rose-50/70 px-4 py-3 text-left text-rose-700 hover:bg-rose-100"
              >
                <span className="inline-flex items-center gap-2 text-base font-semibold text-rose-600">
                  <AirbnbIcon className="h-4 w-4" />
                  Search Airbnb
                </span>
              </LinkButton>

              <LinkButton
                href={vrboUrl}
                target="_blank"
                weight="hollow"
                className="justify-start rounded-xl border-blue-200 bg-blue-50/70 px-4 py-3 text-left text-blue-700 hover:bg-blue-100"
              >
                <span className="inline-flex items-center gap-2 text-base font-semibold text-blue-600">
                  <VrboIcon className="h-4 w-auto" />
                  Search Vrbo
                </span>
              </LinkButton>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
              Add a location to this trip to enable one-click Airbnb and Vrbo searches.
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Add listings</p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Label htmlFor="trip-actions-import-url" className="sr-only">
                Listing URL
              </Label>
              <Input
                id="trip-actions-import-url"
                type="url"
                placeholder="Paste Airbnb or Vrbo URL..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                disabled={isImporting}
                className="min-w-0 flex-1"
              />
              <Button
                onClick={handleImport}
                disabled={isImporting || !importUrl}
                icon="link"
                text={isImporting ? 'Importing...' : 'Import URL'}
                className="w-full sm:w-auto"
              />
            </div>

            <ListingFormSheet tripId={trip.id}>
              <Button weight="hollow" className="w-full" icon="plus" text="Add Manually" />
            </ListingFormSheet>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
