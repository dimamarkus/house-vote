import type { Trip, User } from 'db';
import { TripActionsCard } from './TripActionsCard';
import { CollaboratorsList } from './CollaboratorsList';
import { TripImportTokenCard } from './TripImportTokenCard';
import { VotingAccessCard } from './VotingAccessCard';
import { generateAirbnbUrl, generateVrboUrl } from '../utils/travelLinks';

interface TripSidebarProps {
  trip: Pick<Trip, 'id' | 'userId' | 'location' | 'startDate' | 'endDate' | 'numberOfPeople' | 'name' | 'description'> & {
    collaborators?: User[]; // Make collaborators optional as they might not always be included
  };
  guestNames: string[];
  currentGuestName: string | null; // Pass through from page
  isOwner: boolean; // Pass through from page
  publishedShareSummary?: {
    share: {
      token: string;
      isPublished: boolean;
      votingOpen: boolean;
      allowGuestSuggestions: boolean;
    } | null;
    listings: Array<{
      id: string;
      title: string;
      status: string;
    }>;
    guests: Array<{
      id: string;
      guestDisplayName: string;
      source: 'OWNER_ADDED' | 'SELF_ADDED';
      votes: Array<{
        listingId: string;
      }>;
    }>;
  };
}

/**
 * Renders the trip action and collaboration cards above the dashboard content.
 */
export function TripSidebar({
  trip,
  guestNames,
  currentGuestName,
  isOwner,
  publishedShareSummary,
}: TripSidebarProps) {
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
      <TripActionsCard trip={trip} airbnbUrl={airbnbUrl} vrboUrl={vrboUrl} />

      {isOwner ? <TripImportTokenCard tripId={trip.id} /> : null}

      {isOwner ? (
        <VotingAccessCard
          tripId={trip.id}
          share={publishedShareSummary?.share ?? null}
        />
      ) : null}

      <CollaboratorsList
        tripId={trip.id}
        owner={{ id: trip.userId }} // Reconstruct owner object
        collaborators={trip.collaborators || []}
        guestNames={guestNames}
        currentGuestName={currentGuestName}
        isOwner={isOwner}
        publishedShareSummary={publishedShareSummary}
      />
    </div>
  );
}