'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';
import { usePublishedGuestSession } from '@/features/trips/hooks/usePublishedGuestSession';
import type { PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { Button } from '@/ui/shadcn/button';

interface PublishedTripTopBarProps {
  token: string;
  share: PublishedTripShareRecord;
  initialSession?: PublishedGuestSessionValue | null;
  mode: 'board' | 'join';
}

export function PublishedTripTopBar({
  token,
  share,
  initialSession = null,
  mode,
}: PublishedTripTopBarProps) {
  const router = useRouter();
  const { activeGuest, clearSession } = usePublishedGuestSession(share.trip.id, share.guests, initialSession);
  const joinHref = `/share/${token}/join`;
  const boardHref = `/share/${token}`;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between xl:px-8">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{share.trip.name}</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate">
            {activeGuest ? (
              <>
                Voting as <strong className="text-foreground">{activeGuest.guestDisplayName}</strong>
              </>
            ) : (
              'Choose your name'
            )}
          </span>
          {mode === 'board' ? (
            <Button
              weight="ghost"
              size="sm"
              onClick={() => {
                clearSession();
                router.push(joinHref);
              }}
            >
              Switch name
            </Button>
          ) : activeGuest ? (
            <Button weight="ghost" size="sm" asChild>
              <Link href={boardHref}>Back to board</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
