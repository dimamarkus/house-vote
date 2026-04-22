import { CalendarDays, MapPin, Users } from 'lucide-react';
import type { Trip } from 'db';
import { Card, CardHeader, CardTitle, CardDescription } from '@/ui/shadcn/card';
import { LinkButton } from '@/ui/core/LinkButton';
import { AirbnbIcon, VrboIcon } from '@/components/TravelSourceIcons';
import type { TripFormData } from '../schemas';
import { TripFormSheet } from '../forms/TripFormSheet';
import { formatTripDateRange } from '../utils/formatTripDateRange';
import { generateAirbnbUrl, generateVrboUrl } from '../utils/travelLinks';
import { TripPriceBasisToggle } from './TripPriceBasisToggle';

interface TripHeaderProps {
  trip: Partial<Trip> & Pick<Trip, 'id' | 'name' | 'userId' | 'startDate' | 'endDate' | 'location' | 'numberOfPeople' | 'description'>;
}

export function TripHeader({ trip }: TripHeaderProps) {
  const tripDateRange = formatTripDateRange(trip.startDate, trip.endDate);
  const canSearchTravelSites = Boolean(trip.location);
  const airbnbUrl = generateAirbnbUrl({
    location: trip.location,
    startDate: trip.startDate,
    endDate: trip.endDate,
    numberOfPeople: trip.numberOfPeople,
  });
  const vrboUrl = generateVrboUrl({
    location: trip.location,
    startDate: trip.startDate,
    endDate: trip.endDate,
    numberOfPeople: trip.numberOfPeople,
  });
  const tripInitialData: TripFormData = {
    name: trip.name,
    description: trip.description ?? null,
    location: trip.location ?? null,
    startDate: trip.startDate ? new Date(trip.startDate) : null,
    endDate: trip.endDate ? new Date(trip.endDate) : null,
    numberOfPeople: trip.numberOfPeople ?? null,
  };

  return (
    <Card className="mb-6 overflow-hidden border-0 bg-gradient-to-br from-background via-background to-muted/20 shadow-none">
      <CardHeader className="gap-6">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-6">
          <div className="space-y-5">
            <div className="space-y-3">
              <CardTitle className="text-3xl tracking-tight sm:text-4xl">{trip.name}</CardTitle>
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
              {trip.description ? (
                <CardDescription className="max-w-3xl text-base leading-7 text-muted-foreground">
                  {trip.description}
                </CardDescription>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
            <TripPriceBasisToggle
              tripContext={{
                numberOfPeople: trip.numberOfPeople ?? null,
                startDate: trip.startDate ? new Date(trip.startDate) : null,
                endDate: trip.endDate ? new Date(trip.endDate) : null,
              }}
            />
            {canSearchTravelSites ? (
              <>
                <LinkButton
                  href={airbnbUrl}
                  target="_blank"
                  size="sm"
                  weight="hollow"
                  className="justify-start rounded-xl border-rose-200 bg-rose-50/70 px-4 text-rose-700 hover:bg-rose-100"
                >
                  <span className="inline-flex items-center gap-2 font-semibold text-rose-600">
                    <AirbnbIcon className="h-4 w-4" />
                    Search Airbnb
                  </span>
                </LinkButton>

                <LinkButton
                  href={vrboUrl}
                  target="_blank"
                  size="sm"
                  weight="hollow"
                  className="justify-start rounded-xl border-blue-200 bg-blue-50/70 px-4 text-blue-700 hover:bg-blue-100"
                >
                  <span className="inline-flex items-center gap-2 font-semibold text-blue-600">
                    <VrboIcon className="h-4 w-auto" />
                    Search Vrbo
                  </span>
                </LinkButton>
              </>
            ) : null}
            <TripFormSheet
              tripId={trip.id}
              initialData={tripInitialData}
              triggerLabel="Edit trip"
              triggerWeight="hollow"
              triggerSize="sm"
              triggerIcon="settings"
              triggerClassName="w-full sm:w-auto"
            />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}