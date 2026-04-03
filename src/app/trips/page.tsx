import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { EmptyState } from '@turbodima/ui/core/EmptyState';
import { LinkButton } from '@turbodima/ui/core/LinkButton';
import { PlusCircle } from 'lucide-react';
import { getTrips } from '@/features/trips/actions/getTrips';
import { TripsTable } from '@/features/trips/tables/TripsTable';
import { processSearchParams } from '@turbodima/core/search-params';

export const metadata = {
  title: 'My Trips | Housevote',
  description: 'Plan and manage your house hunting trips',
};

export default async function TripsPage({
  searchParams
}: {
  searchParams: Promise<{
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  // 1. Authentication & Authorization
  const { userId } = await auth(); // Await the auth() call
  if (!userId) {
    // Middleware should handle this, but belt-and-suspenders
    redirect('/sign-in');
  }

  // 2. Parse Search Parameters using the utility
  const { page, sortBy, sortOrder } = await processSearchParams<'createdAt' | 'name' | 'startDate'>(
    searchParams,
    {
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
      defaultLimit: 10 // Assuming a default limit, adjust if needed
    }
  );

  // 3. Fetch Data
  const tripsResponse = await getTrips({
    page,
    sortBy,
    sortOrder,
    // limit: limit // Use limit from processSearchParams if needed
  });

  console.log('tripsResponse', tripsResponse);
  const trips = tripsResponse.success ? tripsResponse.data : [];

  console.log('trips', trips);
  // Define the action button component
  const CreateTripButton = (
    <LinkButton href="/trips/create">
      <PlusCircle className="w-4 h-4 mr-2" /> Create New Trip
    </LinkButton>
  );

  return (
    // Use a simple container for full-width content area
    <div className="container py-8 space-y-6">
      {/* Re-create the header section */}
      <div className="flex  gap-4 md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Trips</h1>
          <p className="text-muted-foreground">
            View and manage your own and shared house hunting trips.
          </p>
        </div>
        {CreateTripButton}
      </div>

      {/* Main content area */}
      {trips.length === 0 ? (
        <EmptyState
          icon={<PlusCircle className="w-10 h-10" />}
          title="No trips yet"
          description="Get started by planning your first house hunting trip."
          action={CreateTripButton}
        />
      ) : (
        // Table should now take the width of the container
        <TripsTable trips={Array.isArray(trips) ? trips.flat() : []} currentUserId={userId} />
      )}
    </div>
  );
}