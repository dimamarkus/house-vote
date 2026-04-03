'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type ViewMode = 'table' | 'map' | 'card';

export function useTripViewMode(tripId: string): [ViewMode, (mode: ViewMode) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialViewParam = searchParams.get('view');
  const initialViewMode: ViewMode = (initialViewParam === 'map' || initialViewParam === 'card')
                                     ? initialViewParam
                                     : 'table';

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  // Update state if URL changes externally
  useEffect(() => {
    const urlViewMode = searchParams.get('view') as ViewMode;
    const validUrlViewMode: ViewMode | null = (urlViewMode === 'table' || urlViewMode === 'map' || urlViewMode === 'card')
                                            ? urlViewMode
                                            : null;

    if (validUrlViewMode && validUrlViewMode !== viewMode) {
      setViewMode(validUrlViewMode);
    }
    // Initialize state if searchParam is present on mount and different
    if (validUrlViewMode && viewMode !== validUrlViewMode){
        setViewMode(validUrlViewMode);
    }
    // Handle case where URL param becomes invalid or missing, reset to table
    else if (!validUrlViewMode && viewMode !== 'table') {
        setViewMode('table');
    }

  }, [searchParams, viewMode]);

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('view', mode);
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`/trips/${tripId}${query}`);
  }, [router, searchParams, tripId]);

  return [viewMode, handleSetViewMode];
}