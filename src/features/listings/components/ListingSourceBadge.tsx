'use client';

import { Badge } from '@/ui/shadcn/badge';
import { AirbnbLogotype, GlobeIcon, VrboLogotype } from '@/components/TravelSourceIcons';

interface ListingSourceBadgeProps {
  source?: 'MANUAL' | 'AIRBNB' | 'VRBO' | 'UNKNOWN' | null;
  href?: string | null;
  showManual?: boolean;
}

export function ListingSourceBadge({
  source = 'MANUAL',
  href,
  showManual = true,
}: ListingSourceBadgeProps) {
  const normalizedHref = typeof href === 'string' && href.length > 0 ? href : null;

  const renderBadge = () => {
    if (source === 'AIRBNB') {
      return (
        <Badge
          weight="hollow"
          className="border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700"
          title="Open original Airbnb listing"
        >
          <AirbnbLogotype />
        </Badge>
      );
    }

    if (source === 'VRBO') {
      return (
        <Badge
          weight="hollow"
          className="border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700"
          title="Open original Vrbo listing"
        >
          <VrboLogotype />
        </Badge>
      );
    }

    if (source === 'UNKNOWN' || normalizedHref) {
      return (
        <Badge
          weight="hollow"
          className="border-slate-200 bg-slate-50 px-2 text-slate-700"
          title="Open original listing"
        >
          <GlobeIcon className="h-3.5 w-3.5 shrink-0" />
        </Badge>
      );
    }

    if (!showManual) {
      return null;
    }

    return <Badge weight="hollow">Manual</Badge>;
  };

  const badge = renderBadge();

  if (!badge) {
    return null;
  }

  if (!normalizedHref) {
    return badge;
  }

  return (
    <a
      href={normalizedHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Open original listing"
      title="Open original listing"
    >
      {badge}
    </a>
  );
}
