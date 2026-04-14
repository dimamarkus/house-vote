'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import type { PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';
import { usePublishedGuestSession } from '@/features/trips/hooks/usePublishedGuestSession';
import type { PublishedTripListingRecord, PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { Badge } from '@/ui/shadcn/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/ui/shadcn/sheet';
import { cn } from '@/ui/utils/cn';
import { Users } from 'lucide-react';

interface PublishedTripGuestsSheetProps {
  share: PublishedTripShareRecord;
  listings: PublishedTripListingRecord[];
  initialSession?: PublishedGuestSessionValue | null;
}

const detailPillClassName = 'inline-flex max-w-full items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium leading-snug';

export function PublishedTripGuestsSheet({
  share,
  listings,
  initialSession = null,
}: PublishedTripGuestsSheetProps) {
  const { activeGuest } = usePublishedGuestSession(share.trip.id, share.guests, initialSession);
  const listingPreviewById = useMemo(() => {
    return new Map(
      listings.map((listing) => [
        listing.id,
        {
          photoUrl: listing.photos[0]?.url ?? null,
          title: listing.title,
        },
      ]),
    );
  }, [listings]);
  const guestCount = share.guests.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            detailPillClassName,
            'cursor-pointer transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
          aria-label={`Open guest list for ${share.trip.name}`}
        >
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="wrap-break-word">
            {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center gap-2">
            <SheetTitle>Guests</SheetTitle>
            <Badge variant="secondary">{guestCount}</Badge>
          </div>
          <SheetDescription>
            Everyone currently on this trip and the listing they are voting for.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {share.guests.length > 0 ? (
            <div className="space-y-3">
              {share.guests.map((guest) => {
                const currentVoteListingId = guest.votes[0]?.listingId;
                const currentVoteListing = currentVoteListingId
                  ? listingPreviewById.get(currentVoteListingId)
                  : null;
                const isActiveGuest = activeGuest?.id === guest.id;

                return (
                  <div
                    key={guest.id}
                    className={cn(
                      'rounded-xl border bg-muted/10 p-3',
                      isActiveGuest ? 'border-primary bg-primary/5 shadow-sm' : undefined,
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{guest.guestDisplayName}</p>
                      {isActiveGuest ? <Badge>You</Badge> : null}
                    </div>
                    {currentVoteListing ? (
                      <div className="mt-2 flex items-center gap-3 rounded-lg border bg-background p-2">
                        {currentVoteListing.photoUrl ? (
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
                            <Image
                              src={currentVoteListing.photoUrl}
                              alt={currentVoteListing.title}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            Current vote
                          </p>
                          <p className="truncate text-sm font-medium text-foreground" title={currentVoteListing.title}>
                            {currentVoteListing.title}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No vote yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No guests have joined this trip yet.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
