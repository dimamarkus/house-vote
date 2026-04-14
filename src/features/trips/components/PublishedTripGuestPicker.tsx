'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  claimPublishedTripGuest,
  createPublishedTripGuest,
} from '@/features/trips/actions/publishedTripActions';
import type { PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';
import { usePublishedGuestSession } from '@/features/trips/hooks/usePublishedGuestSession';
import type { PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { Button } from '@/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { Input } from '@/ui/shadcn/input';
import { cn } from '@/ui/utils/cn';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

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
  const router = useRouter();
  const { activeGuest, clearSession, persistSession, rawSession, session } = usePublishedGuestSession(
    share.trip.id,
    share.guests,
    initialSession,
  );
  const [displayName, setDisplayName] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const votingHref = `/share/${token}`;

  useEffect(() => {
    if (rawSession && !session) {
      clearSession();
    }
  }, [clearSession, rawSession, session]);

  useEffect(() => {
    if (session && !activeGuest) {
      clearSession();
      toast.error('Your guest session is no longer available. Please pick your name again.');
    }
  }, [activeGuest, clearSession, session]);

  async function handlePickGuest(guestId: string) {
    setPendingAction(`pick-${guestId}`);
    const result = await claimPublishedTripGuest({
      token,
      guestId,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to use that guest name.');
      return;
    }

    persistSession({
      guestId: result.data.guestId,
      guestDisplayName: result.data.guestDisplayName,
    });
    router.push(votingHref);
    router.refresh();
  }

  async function handleCreateGuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPendingAction('create-guest');
    const result = await createPublishedTripGuest({
      token,
      displayName,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to add your name.');
      return;
    }

    setDisplayName('');
    persistSession({
      guestId: result.data.guestId,
      guestDisplayName: result.data.guestDisplayName,
    });
    router.push(votingHref);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="items-center gap-2 text-center">
          <CardTitle className="text-2xl sm:text-3xl">Who are you voting as?</CardTitle>
          <CardDescription className="max-w-xl text-base">
            Pick your name below, or add yourself if you do not see it yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6 pt-0 sm:p-8 sm:pt-0">
          {share.guests.length > 0 ? (
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
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
              No names are on the list yet. Add yourself below to start voting.
            </div>
          )}

          <div className="mx-auto max-w-md border-t border-border/60 pt-6">
            <div className="space-y-3">
              <p className="text-center text-sm font-medium">Not on the list?</p>
              <form onSubmit={handleCreateGuest} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Enter your name"
                  disabled={pendingAction === 'create-guest'}
                  className="min-w-0 flex-1"
                />
                <Button type="submit" disabled={pendingAction === 'create-guest'} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Join voting
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
