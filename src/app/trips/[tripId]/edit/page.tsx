'use client'; // Needs to be client for hooks and binding action

import { getTrip } from '@/features/trips/actions/getTrip';
import { updateTrip } from '@/features/trips/actions/updateTrip';
import { TripForm } from '@/features/trips/forms/TripForm';
import type { TripFormData } from '@/features/trips/schemas';
import { Button } from '@/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditTripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [tripData, setTripData] = useState<Partial<TripFormData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;
    getTrip(tripId)
      .then((res) => {
        // Explicitly check for the error case first
        if (!res.success) {
          const errorMsg = typeof res.error === 'string'
              ? res.error
              : 'Failed to load trip data.';
          setError(errorMsg);
        } else if (res.data && !Array.isArray(res.data)) {
          // Handle the success case with valid, non-array data
          const initialFormData: Partial<TripFormData> = {
            name: res.data.name,
            description: res.data.description ?? null,
            location: res.data.location ?? null,
            startDate: res.data.startDate,
            endDate: res.data.endDate,
            numberOfPeople: res.data.numberOfPeople ?? null,
          };
          setTripData(initialFormData);
        } else {
          // Handle the unexpected success case (e.g., missing data or array data)
          console.error("Received unexpected data format for trip:", res.data);
          setError('Received invalid data format for trip.');
        }
      })
      .catch((err) => {
        console.error("Error fetching trip for edit:", err);
        setError('An unexpected error occurred while loading trip data.');
      })
      .finally(() => setIsLoading(false));
  }, [tripId]);

  if (isLoading) {
    return <div className="container py-8 text-center">Loading trip details...</div>;
  }

  if (error) {
    return (
        <div className="container py-8 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">Error Loading Trip</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{error}</p>
                    <Button weight="hollow" onClick={() => router.back()} className="mt-4">Go Back</Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!tripData) {
    // Should ideally be caught by error state, but as a fallback
    return <div className="container py-8 text-center">Trip data could not be loaded.</div>;
  }

  // Bind the updateTrip action with the current tripId
  const boundUpdateAction = updateTrip.bind(null, tripId);

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Trip: {tripData.name}</CardTitle>
            <CardDescription>
              Update the details for this trip.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TripForm
              initialData={tripData}
              tripId={tripId}
              boundUpdateAction={boundUpdateAction}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}