import type { Trip, User } from 'db';
import { TripDetailsCard } from './TripDetailsCard';
import { CollaboratorsList } from './CollaboratorsList';
import { TripImportTokenCard } from './TripImportTokenCard';

interface TripSidebarProps {
  trip: Pick<Trip, 'id' | 'userId' | 'location' | 'startDate' | 'endDate' | 'numberOfPeople' | 'name' | 'description'> & {
    collaborators?: User[]; // Make collaborators optional as they might not always be included
  };
  guestNames: string[];
  currentGuestName: string | null; // Pass through from page
  isOwner: boolean; // Pass through from page
}

/**
 * Renders the trip summary cards above the dashboard content.
 */
export function TripSidebar({ trip, guestNames, currentGuestName, isOwner }: TripSidebarProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <TripDetailsCard trip={trip} />

      {isOwner ? <TripImportTokenCard tripId={trip.id} /> : null}

      <CollaboratorsList
        tripId={trip.id}
        owner={{ id: trip.userId }} // Reconstruct owner object
        collaborators={trip.collaborators || []}
        guestNames={guestNames}
        currentGuestName={currentGuestName}
        isOwner={isOwner}
      />
    </div>
  );
}