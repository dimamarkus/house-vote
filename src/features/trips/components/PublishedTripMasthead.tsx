import type { ReactNode } from 'react';
import type { PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { CardDescription, CardTitle } from '@/ui/shadcn/card';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { TripMetaPill } from './TripMetaPill';

interface PublishedTripMastheadProps {
  share: PublishedTripShareRecord;
  tripDateRange: string | null;
  actionSlot?: ReactNode;
  contextSlot?: ReactNode;
  guestDetailsSlot?: ReactNode;
}

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
                <TripMetaPill icon={MapPin} label={share.trip.location} />
              ) : null}
              {tripDateRange ? (
                <TripMetaPill icon={CalendarDays} label={tripDateRange} />
              ) : null}
              {guestDetailsSlot ?? (
                share.trip.numberOfPeople ? (
                  <TripMetaPill icon={Users} label={`${share.trip.numberOfPeople} guests`} />
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
