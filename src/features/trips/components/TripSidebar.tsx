import type { Trip, User } from 'db';
import { TripDetailsCard } from './TripDetailsCard';
import { CollaboratorsList } from './CollaboratorsList';

interface TripSidebarProps {
  trip: Pick<Trip, 'id' | 'userId' | 'location' | 'startDate' | 'endDate' | 'numberOfPeople' | 'name' | 'description'> & {
    collaborators?: User[]; // Make collaborators optional as they might not always be included
  };
  guestNames: string[];
  currentGuestName: string | null; // Pass through from page
  isOwner: boolean; // Pass through from page
}

/**
 * Renders the sidebar content for the trip dashboard,
 * including import, details, and collaborators.
 */
export function TripSidebar({ trip, guestNames, currentGuestName, isOwner }: TripSidebarProps) {
  return (
    <div className="md:col-span-1 space-y-6">

      <TripDetailsCard trip={trip} />

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