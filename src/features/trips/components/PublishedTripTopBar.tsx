'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';
import {
  isPublishedListingCardView,
  usePublishedListingCardView,
} from '@/features/trips/hooks/usePublishedListingCardView';
import { usePublishedGuestSession } from '@/features/trips/hooks/usePublishedGuestSession';
import type { PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { Button } from '@/ui/shadcn/button';
import { Tabs, TabsList, TabsTrigger } from '@/ui/shadcn/tabs';

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
  const [cardView, setCardView] = usePublishedListingCardView();
  const joinHref = `/share/${token}/join`;
  const boardHref = `/share/${token}`;

  function handleSwitchGuest() {
    clearSession();
    router.push(joinHref);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex w-full max-w-none flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between 2xl:px-10">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{share.trip.name}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {mode === 'board' ? (
            <Tabs
              value={cardView}
              onValueChange={(value) => {
                if (isPublishedListingCardView(value)) {
                  setCardView(value);
                }
              }}
            >
              <TabsList aria-label="Listing card view" className="h-9 w-full sm:w-auto">
                <TabsTrigger value="beds" className="flex-1 px-3 sm:flex-none">
                  Beds
                </TabsTrigger>
                <TabsTrigger value="info" className="flex-1 px-3 sm:flex-none">
                  Info
                </TabsTrigger>
                <TabsTrigger value="votes" className="flex-1 px-3 sm:flex-none">
                  Votes
                </TabsTrigger>
                <TabsTrigger value="feedback" className="flex-1 px-3 sm:flex-none">
                  Pros / cons
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex-1 px-3 sm:flex-none">
                  Comments
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground sm:justify-end">
            <span className="truncate">
              {activeGuest ? (
                <>
                  Voting as{' '}
                  {mode === 'board' ? (
                    <button
                      type="button"
                      className="rounded-sm font-semibold text-blue-600 underline underline-offset-4 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={handleSwitchGuest}
                    >
                      {activeGuest.guestDisplayName}
                    </button>
                  ) : (
                    <strong className="text-foreground">{activeGuest.guestDisplayName}</strong>
                  )}
                </>
              ) : (
                'Choose your name'
              )}
            </span>
            {mode === 'join' && activeGuest ? (
              <Button weight="ghost" size="sm" asChild>
                <Link href={boardHref}>Back to board</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
