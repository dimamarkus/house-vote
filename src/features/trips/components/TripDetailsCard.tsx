'use client'; // Needs Button/Icon components

import type { Trip } from 'db';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@turbodima/ui/shadcn/card';
import { generateAirbnbUrl, generateVrboUrl } from '../utils/travelLinks';
import { formatTripDateRange } from '../utils/formatTripDateRange';
import { AirbnbIcon, VrboIcon } from './TripIcons';
import { MapPin, Calendar, Users } from 'lucide-react';
import { LinkButton } from '@turbodima/ui/core/LinkButton';
import { Flex } from '@turbodima/ui/core/Flex';
import { TripFormSheet } from '../forms/TripFormSheet';

interface TripDetailsCardProps {
  // Use the specific fields needed by this component
  trip: Pick<Trip, 'location' | 'startDate' | 'endDate' | 'numberOfPeople' | 'id' | 'name' | 'description'>;
}

/**
 * Displays core trip details like location, dates, and guests in a card.
 * Includes links to search Airbnb and Vrbo.
 */
export function TripDetailsCard({ trip }: TripDetailsCardProps) {
  // Prepare initialData for TripFormSheet, ensuring correct types
  const tripInitialData = {
    name: trip.name,
    description: trip.description ?? undefined,
    location: trip.location ?? undefined,
    startDate: trip.startDate ? new Date(trip.startDate) : null,
    endDate: trip.endDate ? new Date(trip.endDate) : null,
    numberOfPeople: trip.numberOfPeople ?? undefined,
  };
  const tripDateRange = formatTripDateRange(trip.startDate, trip.endDate);

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Trip Details</CardTitle>
        <CardAction>
          <TripFormSheet tripId={trip.id} initialData={tripInitialData} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Flex.Row align="center">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground mr-auto">Location:</span>
          {trip.location || 'Not set'}
        </Flex.Row>
        <Flex.Row align="center"  >
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground mr-auto">Dates:</span>
          {tripDateRange ?? 'Not set'}
        </Flex.Row>
        <Flex.Row align="center">
          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground mr-auto">Guests:</span>
          {trip.numberOfPeople?.toString() || 'Not set'}
        </Flex.Row>
      </CardContent>
      {trip.location && (
        <CardContent className="pt-2 flex items-center gap-2">
          <LinkButton
            href={generateAirbnbUrl({
              location: trip.location,
              startDate: trip.startDate ? new Date(trip.startDate) : null,
              endDate: trip.endDate ? new Date(trip.endDate) : null,
              numberOfPeople: trip.numberOfPeople
            })}
            icon=""
            target="_blank"
            className="bg-white hover:bg-rose-50 text-rose-600 border-rose-200 w-1/2"
            weight="hollow"
            size="sm"
          >
            <span className="inline-flex items-center gap-2"><AirbnbIcon /> Search Airbnb</span>
          </LinkButton>
          <LinkButton
            href={generateVrboUrl({
              location: trip.location,
              startDate: trip.startDate ? new Date(trip.startDate) : null,
              endDate: trip.endDate ? new Date(trip.endDate) : null,
              numberOfPeople: trip.numberOfPeople
            })}
            icon=""
            target="_blank"
            className="bg-white hover:bg-blue-50 text-blue-600 border-blue-200 w-1/2"
          >
            <span className="inline-flex items-center gap-2"><VrboIcon /> Search Vrbo</span>
          </LinkButton>
        </CardContent>
      )}
    </Card>
  );
}