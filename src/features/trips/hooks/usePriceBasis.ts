'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  DEFAULT_PRICE_BASIS,
  isPriceBasis,
  type PriceBasis,
} from '@/features/listings/utils/priceBasis';

export const PRICE_BASIS_STORAGE_KEY = 'housevote.priceBasis';

/**
 * Name of the same-tab custom event this hook dispatches when the basis
 * changes. The `storage` event only fires across tabs, so we need a parallel
 * channel so every mounted instance in the same tab updates in sync.
 */
const PRICE_BASIS_CHANGE_EVENT = 'housevote:pricebasis:change';

function readStoredBasis(): PriceBasis {
  if (typeof window === 'undefined') return DEFAULT_PRICE_BASIS;
  const raw = window.localStorage.getItem(PRICE_BASIS_STORAGE_KEY);
  return isPriceBasis(raw) ? raw : DEFAULT_PRICE_BASIS;
}

function subscribe(onChange: () => void): () => void {
  function handleStorage(event: StorageEvent) {
    if (event.key === PRICE_BASIS_STORAGE_KEY) onChange();
  }
  window.addEventListener('storage', handleStorage);
  window.addEventListener(PRICE_BASIS_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(PRICE_BASIS_CHANGE_EVENT, onChange);
  };
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
    window.dispatchEvent(new Event(PRICE_BASIS_CHANGE_EVENT));
  }, []);

  return [basis, setBasis];
}
