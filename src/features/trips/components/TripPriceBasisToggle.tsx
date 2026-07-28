'use client';

import { Button } from '@/ui/core/Button';
import { cn } from '@/ui/utils/cn';
import {
  PRICE_BASIS_VALUES,
  availablePriceBases,
  priceBasisLabel,
  type PriceBasis,
  type TripPriceContext,
} from '@/features/listings/utils/priceBasis';
import { getPartyUnitLabels } from '../utils/partyUnitLabels';
import { usePriceBasis } from '../hooks/usePriceBasis';

interface TripPriceBasisToggleProps {
  /**
   * Trip-level inputs used to decide which toggle options can be computed.
   * When party-unit count is missing, the per-unit option is disabled.
   */
  tripContext: TripPriceContext;
  className?: string;
}

/**
 * Two-way toggle for how prices render across the trip's listings. Backed
 * by `usePriceBasis`, so every card/row on the page updates in sync.
 */
export function TripPriceBasisToggle({ tripContext, className }: TripPriceBasisToggleProps) {
  const [basis, setBasis] = usePriceBasis();
  const available = availablePriceBases(tripContext);
  const partyLabels = getPartyUnitLabels(tripContext.partyUnit);

  // If only total is available there's nothing to toggle — hide the
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
        const label = priceBasisLabel(value, tripContext.partyUnit);
        return (
          <Button
            key={value}
            text={label}
            variant="neutral"
            weight={active ? 'solid' : 'hollow'}
            size="sm"
            disabled={!enabled}
            onClick={() => setBasis(value)}
            aria-pressed={active}
            title={
              enabled
                ? label
                : missingContextMessage(value, partyLabels.singular)
            }
          />
        );
      })}
    </div>
  );
}

function missingContextMessage(basis: PriceBasis, singular: string): string {
  switch (basis) {
    case 'PER_GUEST':
      return `Set the trip ${singular} count to view per-${singular} pricing`;
    case 'TOTAL':
      return 'Set the trip dates to view the stay total';
    case 'NIGHTLY':
      return priceBasisLabel(basis, 'GUEST');
    default: {
      const _exhaustive: never = basis;
      return _exhaustive;
    }
  }
}
