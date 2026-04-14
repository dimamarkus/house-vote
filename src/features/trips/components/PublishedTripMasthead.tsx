import type { ReactNode } from 'react';
import type { PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { CardDescription, CardTitle } from '@/ui/shadcn/card';
import { CalendarDays, MapPin, Users } from 'lucide-react';

interface PublishedTripMastheadProps {
  share: PublishedTripShareRecord;
  tripDateRange: string | null;
  actionSlot?: ReactNode;
  contextSlot?: ReactNode;
  guestDetailsSlot?: ReactNode;
}

const detailPillClassName = 'inline-flex max-w-full items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium leading-snug';

export function PublishedTripMasthead({
  share,
  tripDateRange,
  actionSlot,
  contextSlot,
  guestDetailsSlot,
}: PublishedTripMastheadProps) {
  return (
    <section className="w-full rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <CardTitle className="text-3xl sm:text-4xl">{share.trip.name}</CardTitle>
              {share.trip.description ? (
                <CardDescription className="max-w-3xl text-base">
                  {share.trip.description}
                </CardDescription>
              ) : null}
            </div>
          </div>
          <div className="w-full xl:max-w-xl xl:flex-none">
            <div className="flex flex-wrap gap-3 xl:justify-end">
              {share.trip.location ? (
                <div className={detailPillClassName}>
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="wrap-break-word">{share.trip.location}</span>
                </div>
              ) : null}
              {tripDateRange ? (
                <div className={detailPillClassName}>
                  <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="wrap-break-word">{tripDateRange}</span>
                </div>
              ) : null}
              {guestDetailsSlot ?? (
                share.trip.numberOfPeople ? (
                  <div className={detailPillClassName}>
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="wrap-break-word">{share.trip.numberOfPeople} guests</span>
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
        {actionSlot ? <div>{actionSlot}</div> : null}
        {contextSlot ? (
          <div className="border-t border-border/60 pt-4">
            {contextSlot}
          </div>
        ) : null}
      </div>
    </section>
  );
}
