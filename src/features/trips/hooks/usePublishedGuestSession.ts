'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  encodePublishedGuestSessionCookieValue,
  getPublishedGuestSessionKey,
  parsePublishedGuestSession,
  PUBLISHED_GUEST_SESSION_COOKIE_MAX_AGE_SECONDS,
  serializePublishedGuestSession,
  type PublishedGuestSessionValue,
} from '@/features/trips/constants/publishedGuestSession';
import type { PublishedTripGuestRecord } from '@/features/trips/publishedDb';
import { createLocalStorageSubscriber } from '@/ui/utils/createLocalStorageSubscriber';

// No `storageKey` filter — the session key is per-trip (`housevote.guest.<tripId>`)
// and a cross-tab change to any of them can invalidate our active snapshot.
const { subscribe, publishChange: publishGuestSessionChange } = createLocalStorageSubscriber({
  sameTabEventName: 'housevote-published-guest-session-change',
});

function readPublishedGuestSessionSnapshot(sessionKey: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(sessionKey);
}

function clearPublishedGuestSession(sessionKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(sessionKey);
    document.cookie = `${sessionKey}=; path=/; max-age=0; samesite=lax`;
    publishGuestSessionChange();
  }
}

export function usePublishedGuestSession(
  tripId: string,
  guests: PublishedTripGuestRecord[],
  initialSession: PublishedGuestSessionValue | null = null,
) {
  const sessionKey = getPublishedGuestSessionKey(tripId);
  const initialRawSession = initialSession ? serializePublishedGuestSession(initialSession) : null;
  const rawSession = useSyncExternalStore(
    subscribe,
    () => readPublishedGuestSessionSnapshot(sessionKey),
    () => initialRawSession,
  );
  const session = useMemo(() => parsePublishedGuestSession(rawSession), [rawSession]);
  const activeGuest = useMemo(() => {
    if (!session) {
      return null;
    }

    return guests.find((guest) => guest.id === session.guestId) ?? null;
  }, [guests, session]);

  function persistSession(nextSession: PublishedGuestSessionValue) {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(sessionKey, serializePublishedGuestSession(nextSession));
    document.cookie = `${sessionKey}=${encodePublishedGuestSessionCookieValue(nextSession)}; path=/; max-age=${PUBLISHED_GUEST_SESSION_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
    publishGuestSessionChange();
  }

  function clearSession() {
    clearPublishedGuestSession(sessionKey);
  }

  return {
    activeGuest,
    clearSession,
    persistSession,
    rawSession,
    session,
    sessionKey,
  };
}
