'use client';

import type { PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';
import { PublishedTripGuestProvider } from '@/features/trips/components/PublishedTripGuestContext';
import { PublishedTripListingsGrid } from '@/features/trips/components/PublishedTripListingsGrid';
import { usePublishedGuestSession } from '@/features/trips/hooks/usePublishedGuestSession';
import { usePublishedSharePageLifecycle } from '@/features/trips/hooks/usePublishedSharePageLifecycle';
import type { PublishedTripListingRecord, PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { Card, CardContent } from '@/ui/shadcn/card';

interface PublishedTripPageClientProps {
  token: string;
  share: PublishedTripShareRecord;
  listings: PublishedTripListingRecord[];
  initialSession?: PublishedGuestSessionValue | null;
}

export function PublishedTripPageClient({
  token,
  share,
  listings,
  initialSession = null,
}: PublishedTripPageClientProps) {
  const { activeGuest, clearSession, rawSession, session } = usePublishedGuestSession(
    share.trip.id,
    share.guests,
    initialSession,
  );
  const joinHref = `/share/${token}/join`;

  usePublishedSharePageLifecycle({
    joinHref,
    activeGuest,
    rawSession,
    session,
    clearSession,
  });

  if (!activeGuest) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Opening guest picker...
        </CardContent>
      </Card>
    );
  }

  return (
    <PublishedTripGuestProvider value={{ token, share, activeGuest }}>
      <div className="flex w-full flex-col gap-6">
        <PublishedTripListingsGrid listings={listings} />
      </div>
    </PublishedTripGuestProvider>
  );
}
