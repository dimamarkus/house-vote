'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  DEFAULT_PRICE_BASIS,
  isPriceBasis,
  type PriceBasis,
} from '@/features/listings/utils/priceBasis';
import { createLocalStorageSubscriber } from '@/ui/utils/createLocalStorageSubscriber';

export const PRICE_BASIS_STORAGE_KEY = 'housevote.priceBasis';

const { subscribe, publishChange } = createLocalStorageSubscriber({
  sameTabEventName: 'housevote:pricebasis:change',
  storageKey: PRICE_BASIS_STORAGE_KEY,
});

function readStoredBasis(): PriceBasis {
  if (typeof window === 'undefined') return DEFAULT_PRICE_BASIS;
  const raw = window.localStorage.getItem(PRICE_BASIS_STORAGE_KEY);
  return isPriceBasis(raw) ? raw : DEFAULT_PRICE_BASIS;
}

/**
 * Global price-basis toggle, shared across every consumer on the page.
 *
 * We persist to localStorage so the choice survives refreshes and tab
 * navigations, and we pair the native `storage` event (cross-tab) with a
 * custom same-tab event so every mounted instance stays in sync without
 * React Context / provider plumbing.
 *
 * Uses `useSyncExternalStore` so SSR renders the default (no hydration
 * mismatch) and the client hydrates to the stored value via the store's
 * `getSnapshot` / `getServerSnapshot` pair.
 */
export function usePriceBasis(): [PriceBasis, (next: PriceBasis) => void] {
  const basis = useSyncExternalStore<PriceBasis>(
    subscribe,
    readStoredBasis,
    () => DEFAULT_PRICE_BASIS,
  );

  const setBasis = useCallback((next: PriceBasis) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PRICE_BASIS_STORAGE_KEY, next);
    publishChange();
  }, []);

  return [basis, setBasis];
}
