'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to manage the guest user's display name stored in localStorage for a specific trip.
 * Only attempts to read from localStorage if the user is not logged in (userId is null).
 *
 * @param tripId The ID of the trip.
 * @param userId The ID of the current logged-in user (null if guest).
 * @returns The guest's display name or null.
 */
export function useGuestSession(tripId: string | null, userId: string | null): string | null {
  const [currentGuestName, setCurrentGuestName] = useState<string | null>(null);

  useEffect(() => {
    // Only run for guests (not logged-in users) and if tripId is valid
    if (!userId && tripId) {
      const guestSessionKey = `housevote_guest_session_${tripId}`;
      let storedName: string | null = null;

      try {
        const storedSession = localStorage.getItem(guestSessionKey);
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);
          storedName = sessionData.displayName || null;
        }
      } catch (e) {
        console.error("Failed to parse guest session:", e);
        // Attempt to clear corrupted data
        try {
          localStorage.removeItem(guestSessionKey);
        } catch (removeError) {
            console.error("Failed to remove corrupted guest session key:", removeError);
        }
      }

      setCurrentGuestName(storedName);
    }
  }, [userId, tripId]); // Rerun effect if userId or tripId changes

  return currentGuestName;
}