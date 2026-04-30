'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const PUBLISHED_LISTING_CARD_VIEW_VALUES = ['votes', 'feedback'] as const;
export type PublishedListingCardView = (typeof PUBLISHED_LISTING_CARD_VIEW_VALUES)[number];

export const DEFAULT_PUBLISHED_LISTING_CARD_VIEW: PublishedListingCardView = 'votes';
export const PUBLISHED_LISTING_CARD_VIEW_PARAM = 'cardView';

export function isPublishedListingCardView(value: unknown): value is PublishedListingCardView {
  return (
    typeof value === 'string' &&
    (PUBLISHED_LISTING_CARD_VIEW_VALUES as ReadonlyArray<string>).includes(value)
  );
}

export function usePublishedListingCardView(): [
  PublishedListingCardView,
  (nextView: PublishedListingCardView) => void,
] {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardView = useMemo(() => {
    const value = searchParams.get(PUBLISHED_LISTING_CARD_VIEW_PARAM);
    return isPublishedListingCardView(value) ? value : DEFAULT_PUBLISHED_LISTING_CARD_VIEW;
  }, [searchParams]);

  const setCardView = useCallback((nextView: PublishedListingCardView) => {
    if (nextView === cardView) {
      return;
    }

    const nextParams = new URLSearchParams(Array.from(searchParams.entries()));
    if (nextView === DEFAULT_PUBLISHED_LISTING_CARD_VIEW) {
      nextParams.delete(PUBLISHED_LISTING_CARD_VIEW_PARAM);
    } else {
      nextParams.set(PUBLISHED_LISTING_CARD_VIEW_PARAM, nextView);
    }

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [cardView, pathname, router, searchParams]);

  return [cardView, setCardView];
}
