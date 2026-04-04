'use client';

// import { Button } from '@/ui/shadcn/button';
import { useTripViewMode } from '@/features/trips/hooks/useTripViewMode';
import { Button } from '@/ui/core/Button';

interface TripViewToggleProps {
  tripId: string;
}

export function TripViewToggle({ tripId }: TripViewToggleProps) {
  const [viewMode, setViewMode] = useTripViewMode(tripId);

  return (
    <div className="flex justify-end gap-2 mb-6">
      <Button
        text="Table"
        variant="neutral"
        weight={viewMode === 'table' ? 'solid' : 'hollow'}
        size="sm"
        onClick={() => setViewMode('table')}
        aria-pressed={viewMode === 'table'}
        icon="list"
      />
      <Button
        text="Card"
        variant="neutral"
        weight={viewMode === 'card' ? 'solid' : 'hollow'}
        size="sm"
        onClick={() => setViewMode('card')}
        aria-pressed={viewMode === 'card'}
        icon="layout-grid"
      />
      <Button
        text="Map"
        variant="neutral"
        weight={viewMode === 'map' ? 'solid' : 'hollow'}
        size="sm"
        onClick={() => setViewMode('map')}
        aria-pressed={viewMode === 'map'}
        icon="map-pin"
      />
    </div>
  );
}