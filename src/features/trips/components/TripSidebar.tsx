import type { Trip, User } from 'db';
import { CollaboratorsList } from './CollaboratorsList';
import { TripImportTokenCard } from './TripImportTokenCard';
import { VotingAccessCard } from './VotingAccessCard';

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
 * Renders the trip management cards alongside the dashboard content.
 */
export function TripSidebar({
  trip,
  guestNames,
  currentGuestName,
  isOwner,
  publishedShareSummary,
}: TripSidebarProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:flex xl:flex-col">
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