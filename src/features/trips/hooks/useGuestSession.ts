'use client';

import { useMemo } from 'react';

/**
 * Hook to manage the guest user's display name stored in localStorage for a specific trip.
 * Only attempts to read from localStorage if the user is not logged in (userId is null).
 *
 * @param tripId The ID of the trip.
 * @param userId The ID of the current logged-in user (null if guest).
 * @returns The guest's display name or null.
 */
export function useGuestSession(tripId: string | null, userId: string | null): string | null {
  return useMemo(() => {
    if (typeof window === 'undefined' || userId || !tripId) {
      return null;
    }

    const guestSessionKey = `housevote_guest_session_${tripId}`;

    try {
      const storedSession = localStorage.getItem(guestSessionKey);
      if (!storedSession) {
        return null;
      }

      const sessionData = JSON.parse(storedSession) as { displayName?: string };
      return sessionData.displayName || null;
    } catch (error) {
      console.error("Failed to parse guest session:", error);

      try {
        localStorage.removeItem(guestSessionKey);
      } catch (removeError) {
        console.error("Failed to remove corrupted guest session key:", removeError);
      }

      return null;
    }
  }, [tripId, userId]);
}