'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { Button } from '@/ui/shadcn/button';
import { getPublishedGuestSessionKey, type PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';

const PUBLISHED_GUEST_SESSION_EVENT = 'housevote-published-guest-session-change';

interface PublishedVotingIdentityProps {
  tripId: string;
  guests: Array<{
    id: string;
    guestDisplayName: string;
  }>;
}

function parsePublishedGuestSession(rawValue: string | null): PublishedGuestSessionValue | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as PublishedGuestSessionValue;
    if (!parsed.guestId || !parsed.guestDisplayName) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

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

export function PublishedVotingIdentity({ tripId, guests }: PublishedVotingIdentityProps) {
  const sessionKey = getPublishedGuestSessionKey(tripId);
  const rawSession = useSyncExternalStore(
    subscribeToPublishedGuestSession,
    () => readPublishedGuestSessionSnapshot(sessionKey),
    () => null,
  );
  const session = useMemo(() => parsePublishedGuestSession(rawSession), [rawSession]);
  const activeGuest = useMemo(() => {
    if (!session) {
      return null;
    }

    return guests.find((guest) => guest.id === session.guestId) ?? null;
  }, [guests, session]);

  function clearSession() {
    localStorage.removeItem(sessionKey);
    window.dispatchEvent(new Event(PUBLISHED_GUEST_SESSION_EVENT));
  }

  if (!activeGuest) {
    return (
      <p className="text-sm text-muted-foreground">
        Choose your name below to start voting.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
      <span className="text-sm text-muted-foreground">
        Voting as <strong className="text-foreground">{activeGuest.guestDisplayName}</strong>
      </span>
      <Button weight="ghost" size="sm" onClick={clearSession}>
        Switch name
      </Button>
    </div>
  );
}
