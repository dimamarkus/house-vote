'use client';

import { Button } from '@/ui/core/Button';
import { cn } from '@/ui/utils/cn';
import {
  PRICE_BASIS_LABELS,
  PRICE_BASIS_VALUES,
  availablePriceBases,
  type PriceBasis,
  type TripPriceContext,
} from '@/features/listings/utils/priceBasis';
import { usePriceBasis } from '../hooks/usePriceBasis';

interface TripPriceBasisToggleProps {
  /**
   * Trip-level inputs used to decide which toggle options can be computed.
   * When dates are missing, "Total" and "Per guest" fall back to per-night
   * display on the consuming card, so we disable those buttons to make the
   * situation obvious.
   */
  tripContext: TripPriceContext;
  className?: string;
}

/**
 * Three-way toggle for how prices render across the trip's listings. Backed
 * by `usePriceBasis`, so every card/row on the page updates in sync.
 */
export function TripPriceBasisToggle({ tripContext, className }: TripPriceBasisToggleProps) {
  const [basis, setBasis] = usePriceBasis();
  const available = availablePriceBases(tripContext);

  // If only nightly is available there's nothing to toggle — hide the
  // control entirely so we don't imply options that don't work.
  if (available.length <= 1) {
    return null;
  }

  return (
    <div
      role="group"
      aria-label="Price display basis"
      className={cn('inline-flex gap-1 rounded-xl border bg-background p-1 shadow-sm', className)}
    >
      {PRICE_BASIS_VALUES.map((value) => {
        const enabled = available.includes(value);
        const active = basis === value;
        return (
          <Button
            key={value}
            text={PRICE_BASIS_LABELS[value]}
            variant="neutral"
            weight={active ? 'solid' : 'hollow'}
            size="sm"
            disabled={!enabled}
            onClick={() => setBasis(value)}
            aria-pressed={active}
            title={
              enabled
                ? PRICE_BASIS_LABELS[value]
                : missingContextMessage(value, tripContext)
            }
          />
        );
      })}
    </div>
  );
}

function missingContextMessage(basis: PriceBasis, ctx: TripPriceContext): string {
  if (basis === 'TOTAL') {
    return 'Add trip start / end dates to view totals';
  }
  if (basis === 'PER_GUEST') {
    if (!ctx.numberOfPeople) return 'Set the trip guest count to view per-guest pricing';
    return 'Add trip start / end dates to view per-guest pricing';
  }
  return PRICE_BASIS_LABELS[basis];
}
