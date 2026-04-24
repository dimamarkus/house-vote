import { Bath, BedDouble, DoorOpen, Users } from 'lucide-react';
import type { Listing } from 'db';
import { getBedroomLabel } from '@/features/listings/listingTypeOptions';

interface ListingCardMetricsProps {
  listingType: Listing['listingType'];
  bedroomCount?: number | null;
  bedCount?: number | null;
  bathroomCount?: number | null;
  sleepsCount?: number | null;
}

export function ListingCardMetrics({
  listingType,
  bedroomCount,
  bedCount,
  bathroomCount,
  sleepsCount,
}: ListingCardMetricsProps) {
  if (
    bedroomCount == null &&
    bedCount == null &&
    bathroomCount == null &&
    sleepsCount == null
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {bedroomCount != null && (
        <span className="flex items-center gap-1.5 rounded-md bg-muted/80 px-2 py-1 text-xs font-medium text-foreground">
          <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
          {`${bedroomCount} ${getBedroomLabel(listingType, bedroomCount)}`}
        </span>
      )}
      {bedCount != null && (
        <span className="flex items-center gap-1.5 rounded-md bg-muted/80 px-2 py-1 text-xs font-medium text-foreground">
          <BedDouble className="h-3.5 w-3.5 text-muted-foreground" />
          {bedCount === 1 ? '1 Bed' : `${bedCount} Beds`}
        </span>
      )}
      {bathroomCount != null && (
        <span className="flex items-center gap-1.5 rounded-md bg-muted/80 px-2 py-1 text-xs font-medium text-foreground">
          <Bath className="h-3.5 w-3.5 text-muted-foreground" />
          {bathroomCount === 1 ? '1 Bath' : `${bathroomCount} Baths`}
        </span>
      )}
      {sleepsCount != null && (
        <span className="flex items-center gap-1.5 rounded-md bg-muted/80 px-2 py-1 text-xs font-medium text-foreground">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {`Sleeps ${sleepsCount}`}
        </span>
      )}
    </div>
  );
}
