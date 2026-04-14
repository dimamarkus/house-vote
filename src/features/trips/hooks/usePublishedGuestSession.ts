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

const PUBLISHED_GUEST_SESSION_EVENT = 'housevote-published-guest-session-change';

function readPublishedGuestSessionSnapshot(sessionKey: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(sessionKey);
}

function subscribeToPublishedGuestSession(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleChange = () => onStoreChange();

  window.addEventListener('storage', handleChange);
  window.addEventListener(PUBLISHED_GUEST_SESSION_EVENT, handleChange);

  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(PUBLISHED_GUEST_SESSION_EVENT, handleChange);
  };
}

function publishGuestSessionChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PUBLISHED_GUEST_SESSION_EVENT));
  }
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
    subscribeToPublishedGuestSession,
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
