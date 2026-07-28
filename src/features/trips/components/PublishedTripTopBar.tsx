'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, MapPin } from 'lucide-react';
import type { PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';
import {
  isPublishedListingCardView,
  usePublishedListingCardView,
} from '@/features/trips/hooks/usePublishedListingCardView';
import { usePublishedGuestSession } from '@/features/trips/hooks/usePublishedGuestSession';
import type { PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { Button } from '@/ui/shadcn/button';
import { Tabs, TabsList, TabsTrigger } from '@/ui/shadcn/tabs';
import { TripMetaPill } from './TripMetaPill';

const listingCardViewTriggerClassName =
  'flex-1 px-3 text-blue-800/75 hover:bg-blue-100/80 hover:text-blue-950 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm sm:flex-none dark:text-blue-100/80 dark:hover:bg-blue-900/60 dark:hover:text-white dark:data-[state=active]:bg-blue-500 dark:data-[state=active]:text-white';

interface PublishedTripTopBarProps {
  token: string;
  share: PublishedTripShareRecord;
  tripDateRange?: string | null;
  guestDetailsSlot?: ReactNode;
  initialSession?: PublishedGuestSessionValue | null;
  mode: 'board' | 'join';
}

export function PublishedTripTopBar({
  token,
  share,
  tripDateRange = null,
  guestDetailsSlot,
  initialSession = null,
  mode,
}: PublishedTripTopBarProps) {
  const router = useRouter();
  const { activeGuest, clearSession } = usePublishedGuestSession(share.trip.id, share.guests, initialSession);
  const [cardView, setCardView] = usePublishedListingCardView();
  const joinHref = `/share/${token}/join`;
  const boardHref = `/share/${token}`;
  const hasMetaBadges = Boolean(share.trip.location || tripDateRange || guestDetailsSlot);

  function handleSwitchGuest() {
    clearSession();
    router.push(joinHref);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex w-full max-w-none flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between 2xl:px-10">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{share.trip.name}</p>
          {hasMetaBadges ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {share.trip.location ? (
                <TripMetaPill
                  icon={MapPin}
                  label={share.trip.location}
                  className="px-3 py-1.5 text-xs sm:text-sm"
                />
              ) : null}
              {tripDateRange ? (
                <TripMetaPill
                  icon={CalendarDays}
                  label={tripDateRange}
                  className="px-3 py-1.5 text-xs sm:text-sm"
                />
              ) : null}
              {guestDetailsSlot}
            </div>
          ) : null}
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
              <TabsList
                aria-label="Listing card view"
                className="h-9 w-full border border-blue-200 bg-blue-50 p-1 text-blue-800 sm:w-auto dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100"
              >
                <TabsTrigger value="beds" className={listingCardViewTriggerClassName}>
                  Beds
                </TabsTrigger>
                <TabsTrigger value="info" className={listingCardViewTriggerClassName}>
                  Info
                </TabsTrigger>
                <TabsTrigger value="votes" className={listingCardViewTriggerClassName}>
                  Votes
                </TabsTrigger>
                <TabsTrigger value="feedback" className={listingCardViewTriggerClassName}>
                  Pros / cons
                </TabsTrigger>
                <TabsTrigger value="comments" className={listingCardViewTriggerClassName}>
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
                      className="cursor-pointer rounded-sm font-semibold text-blue-600 underline underline-offset-4 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
