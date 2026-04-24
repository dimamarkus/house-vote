'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type {
  PublishedTripGuestRecord,
  PublishedTripShareRecord,
} from '@/features/trips/publishedDb';

/**
 * Values provided to descendants of {@link PublishedTripGuestProvider}.
 *
 * By contract, `activeGuest` is non-null because the provider is only mounted
 * once the parent page has resolved a guest session. Consumers that render
 * before a guest is picked should stay outside the provider.
 */
export interface PublishedTripGuestContextValue {
  token: string;
  share: PublishedTripShareRecord;
  activeGuest: PublishedTripGuestRecord;
}

const PublishedTripGuestContext = createContext<PublishedTripGuestContextValue | null>(null);

interface PublishedTripGuestProviderProps {
  value: PublishedTripGuestContextValue;
  children: ReactNode;
}

export function PublishedTripGuestProvider({ value, children }: PublishedTripGuestProviderProps) {
  return (
    <PublishedTripGuestContext.Provider value={value}>
      {children}
    </PublishedTripGuestContext.Provider>
  );
}

export function usePublishedTripGuest(): PublishedTripGuestContextValue {
  const context = useContext(PublishedTripGuestContext);
  if (!context) {
    throw new Error(
      'usePublishedTripGuest must be used within a PublishedTripGuestProvider.',
    );
  }
  return context;
}
