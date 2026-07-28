import type { ReactNode } from 'react';

interface PublishedTripMastheadProps {
  /** Import / add-listing controls. When omitted, the masthead is not rendered. */
  actionSlot?: ReactNode;
}

/**
 * Public share-page card that hosts only the guest import / add-listing
 * controls. Trip name and meta badges live in `PublishedTripTopBar`.
 */
export function PublishedTripMasthead({ actionSlot }: PublishedTripMastheadProps) {
  if (!actionSlot) {
    return null;
  }

  return (
    <section className="w-full rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="p-6 sm:p-8">{actionSlot}</div>
    </section>
  );
}
