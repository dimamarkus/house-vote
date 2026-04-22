'use client';

import { DollarSign } from 'lucide-react';
import { usePriceBasis } from '@/features/trips/hooks/usePriceBasis';
import {
  computeListingPriceDisplay,
  type TripPriceContext,
} from '../utils/priceBasis';

interface ListingPriceCellProps {
  /** Stored nightly price (whole dollars) for the listing. */
  price: number | null;
  /** Trip-level context; omit outside a trip page to keep nightly-only behavior. */
  tripContext?: TripPriceContext;
}

/**
 * Table cell that respects the user's `usePriceBasis` toggle. Keeps the dollar
 * icon + number styling from the original inline cell; adds a small unit label
 * (e.g. "/ night") so the basis is unambiguous at a glance.
 */
export function ListingPriceCell({ price, tripContext }: ListingPriceCellProps) {
  const [basis] = usePriceBasis();
  const display = computeListingPriceDisplay(price, basis, tripContext);

  if (!display.amount) {
    return <span className="text-muted-foreground italic">N/A</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <span>{display.amount}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {display.unitLabel}
      </span>
    </div>
  );
}
