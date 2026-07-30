'use client';

import { useEffect, useState } from 'react';
import { claimPublishedTripGuest } from '@/features/trips/actions/publishedTripActions';
import type { PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';
import { usePublishedGuestSession } from '@/features/trips/hooks/usePublishedGuestSession';
import type { PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { Button } from '@/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { cn } from '@/ui/utils/cn';
import { toast } from 'sonner';
import { getPartyUnitLabels } from '../utils/partyUnitLabels';

interface PublishedTripGuestPickerProps {
  token: string;
  share: PublishedTripShareRecord;
  initialSession?: PublishedGuestSessionValue | null;
}

export function PublishedTripGuestPicker({
  token,
  share,
  initialSession = null,
}: PublishedTripGuestPickerProps) {
  const { activeGuest, clearSession, persistSession, rawSession, session } = usePublishedGuestSession(
    share.trip.id,
    share.guests,
    initialSession,
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const votingHref = `/share/${token}`;
  const partyLabels = getPartyUnitLabels(share.trip.partyUnit);

  useEffect(() => {
    if (rawSession && !session) {
      clearSession();
    }
  }, [clearSession, rawSession, session]);

  useEffect(() => {
    if (session && !activeGuest) {
      clearSession();
      toast.error(`Your ${partyLabels.singular} session is no longer available. Please pick your name again.`);
    }
  }, [activeGuest, clearSession, partyLabels.singular, session]);

  async function handlePickGuest(guestId: string) {
    setPendingAction(`pick-${guestId}`);
    const result = await claimPublishedTripGuest({
      token,
      guestId,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : `Unable to use that ${partyLabels.singular} name.`);
      return;
    }

    persistSession({
      guestId: result.data.guestId,
      guestDisplayName: result.data.guestDisplayName,
    });
    // Use a full-document navigation instead of `router.replace`. When the
    // viewer is signed in (e.g. the trip owner), Clerk's middleware performs a
    // session handshake/refresh on requests; that can disrupt an in-flight
    // App Router soft navigation and leave the guest stranded on the picker
    // ("clicking a name just refreshes the page"). A hard navigation re-runs
    // middleware cleanly as a normal top-level request and always carries the
    // freshly-set guest session cookie, so the board gate lets us in.
    window.location.assign(votingHref);
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="items-center gap-2 text-center">
          <CardTitle className="text-2xl sm:text-3xl">Welcome to {share.trip.name}</CardTitle>
          <CardDescription className="max-w-xl text-base">
            Pick your name to open the trip. You&apos;ll see all the houses and can add
            your thoughts — voting comes later, once you&apos;ve had a look around.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 pt-0 sm:p-8 sm:pt-0">
          {share.guests.length > 0 ? (
            <div className="space-y-3">
              <p className="text-center text-sm font-medium text-muted-foreground">
                Which {partyLabels.singular} are you? Tap your name to continue.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {share.guests.map((guest) => {
                const isCurrentGuest = activeGuest?.id === guest.id;

                return (
                  <Button
                    key={guest.id}
                    weight={isCurrentGuest ? 'solid' : 'hollow'}
                    onClick={() => handlePickGuest(guest.id)}
                    disabled={pendingAction === `pick-${guest.id}`}
                    className={cn(
                      'h-14 w-full justify-center rounded-xl px-4 text-center text-sm font-semibold sm:h-16 sm:text-base',
                      isCurrentGuest ? 'border-primary' : 'border-border'
                    )}
                  >
                    {guest.guestDisplayName}
                  </Button>
                );
              })}
              </div>
            </div>
          ) : null}

          <div className="mx-auto max-w-md rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
            Not on the list? Ask the trip owner to add you so you can join the trip.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
