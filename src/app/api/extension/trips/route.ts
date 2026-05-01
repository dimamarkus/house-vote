import { auth } from '@clerk/nextjs/server';
import { ErrorCode } from '@/core/errors';
import { trips } from '@/features/trips/db';
import type { TripWithCounts } from '@/features/trips/types';
import { extensionJson, extensionOptionsResponse } from '../cors';

interface ExtensionTripOption {
  id: string;
  name: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  listingCount: number;
  role: 'owner' | 'collaborator';
}

function toExtensionTripOption(trip: TripWithCounts, userId: string): ExtensionTripOption {
  return {
    id: trip.id,
    name: trip.name,
    location: trip.location,
    startDate: trip.startDate ? trip.startDate.toISOString() : null,
    endDate: trip.endDate ? trip.endDate.toISOString() : null,
    listingCount: trip._count?.listings ?? 0,
    role: trip.userId === userId ? 'owner' : 'collaborator',
  };
}

export function OPTIONS() {
  return extensionOptionsResponse();
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return extensionJson(
      {
        success: false,
        error: 'You must be signed in to load extension trips.',
        code: ErrorCode.UNAUTHENTICATED,
      },
      { status: 401 },
    );
  }

  const tripsResult = await trips.getByUser(userId, {
    includes: {
      collaborators: true,
    },
  });

  if (!tripsResult.success) {
    return extensionJson(tripsResult, { status: 500 });
  }

  return extensionJson({
    success: true,
    data: tripsResult.data.map((trip) => toExtensionTripOption(trip, userId)),
  });
}
