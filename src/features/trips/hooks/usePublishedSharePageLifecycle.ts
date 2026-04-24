'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';
import type { PublishedTripGuestRecord } from '@/features/trips/publishedDb';

const VISIBILITY_POLL_INTERVAL_MS = 5000;

interface UsePublishedSharePageLifecycleArgs {
  joinHref: string;
  activeGuest: PublishedTripGuestRecord | null;
  rawSession: string | null;
  session: PublishedGuestSessionValue | null;
  clearSession: () => void;
}

/**
 * Wires together the three side effects the published share page needs:
 *
 * 1. Poll `router.refresh()` every 5s while the tab is visible so listings,
 *    votes, and comments stay in sync for all guests without requiring manual
 *    refresh.
 * 2. If we have a raw session string but parsing failed, clear the bad
 *    session and bounce to the join page.
 * 3. If the parsed session references a guest that the server no longer
 *    knows about, clear the session, toast the user, and bounce to join.
 */
export function usePublishedSharePageLifecycle({
  joinHref,
  activeGuest,
  rawSession,
  session,
  clearSession,
}: UsePublishedSharePageLifecycleArgs) {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, VISIBILITY_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router]);

  useEffect(() => {
    if (rawSession && !session) {
      clearSession();
      router.replace(joinHref);
    }
  }, [clearSession, joinHref, rawSession, router, session]);

  useEffect(() => {
    if (session && !activeGuest) {
      clearSession();
      toast.error('Your guest session is no longer available. Please pick your name again.');
      router.replace(joinHref);
    }
  }, [activeGuest, clearSession, joinHref, router, session]);
}
