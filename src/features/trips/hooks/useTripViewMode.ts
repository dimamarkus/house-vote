'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type ViewMode = 'table' | 'map' | 'card';

function getViewMode(value: string | null): ViewMode {
  return value === 'map' || value === 'card' ? value : 'table';
}

export function useTripViewMode(tripId: string): [ViewMode, (mode: ViewMode) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode = useMemo(
    () => getViewMode(searchParams.get('view')),
    [searchParams],
  );

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    if (mode === viewMode) {
      return;
    }

    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('view', mode);
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`/trips/${tripId}${query}`);
  }, [router, searchParams, tripId, viewMode]);

  return [viewMode, handleSetViewMode];
}