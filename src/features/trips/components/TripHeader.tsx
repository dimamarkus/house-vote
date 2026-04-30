import { CalendarDays, MapPin, Users } from 'lucide-react';
import type { Trip } from 'db';
import { Card, CardHeader, CardTitle, CardDescription } from '@/ui/shadcn/card';
import { LinkButton } from '@/ui/core/LinkButton';
import { AirbnbIcon, VrboIcon } from '@/components/TravelSourceIcons';
import type { TripFormData } from '../schemas';
import { TripFormSheet } from '../forms/TripFormSheet';
import { formatTripDateRange } from '../utils/formatTripDateRange';
import { generateAirbnbUrl, generateVrboUrl } from '../utils/travelLinks';
import { createTripTravelContext, formatTripGuestBreakdownLabel } from '../utils/tripTravelContext';
import { TripMetaPill } from './TripMetaPill';
import { TripPriceBasisToggle } from './TripPriceBasisToggle';

const DASHBOARD_META_PILL_CLASSNAME = 'shadow-sm sm:text-base';

interface TripHeaderProps {
  trip: Partial<Trip> & Pick<Trip, 'id' | 'name' | 'userId' | 'startDate' | 'endDate' | 'location' | 'numberOfPeople' | 'adultCount' | 'childCount' | 'description'>;
}

export function TripHeader({ trip }: TripHeaderProps) {
  const tripDateRange = formatTripDateRange(trip.startDate, trip.endDate);
  const canSearchTravelSites = Boolean(trip.location);
  const tripTravelContext = createTripTravelContext({
    numberOfPeople: trip.numberOfPeople ?? null,
    adultCount: trip.adultCount ?? null,
    childCount: trip.childCount ?? null,
    startDate: trip.startDate,
    endDate: trip.endDate,
  });
  const tripGuestLabel = formatTripGuestBreakdownLabel(tripTravelContext);
  const airbnbUrl = generateAirbnbUrl({
    location: trip.location,
    ...tripTravelContext,
  });
  const vrboUrl = generateVrboUrl({
    location: trip.location,
    ...tripTravelContext,
  });
  const tripInitialData: TripFormData = {
    name: trip.name,
    description: trip.description ?? null,
    location: trip.location ?? null,
    startDate: trip.startDate ? new Date(trip.startDate) : null,
    endDate: trip.endDate ? new Date(trip.endDate) : null,
    numberOfPeople: trip.numberOfPeople ?? null,
    adultCount: trip.adultCount ?? null,
    childCount: trip.childCount ?? null,
  };

  return (
    <Card className="mb-6 overflow-hidden border-0 bg-gradient-to-br from-background via-background to-muted/20 shadow-none">
      <CardHeader className="gap-6">
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-6">
          <div className="space-y-5">
            <div className="space-y-3">
              <CardTitle className="text-3xl tracking-tight sm:text-4xl">{trip.name}</CardTitle>
              {(trip.location || tripDateRange || tripGuestLabel) ? (
                <div className="flex flex-wrap gap-3">
                  {trip.location ? (
                    <TripMetaPill
                      icon={MapPin}
                      label={trip.location}
                      className={DASHBOARD_META_PILL_CLASSNAME}
                    />
                  ) : null}

                  {tripDateRange ? (
                    <TripMetaPill
                      icon={CalendarDays}
                      label={tripDateRange}
                      className={DASHBOARD_META_PILL_CLASSNAME}
                    />
                  ) : null}

                  {tripGuestLabel ? (
                    <TripMetaPill
                      icon={Users}
                      label={tripGuestLabel}
                      className={DASHBOARD_META_PILL_CLASSNAME}
                    />
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
              tripContext={tripTravelContext}
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