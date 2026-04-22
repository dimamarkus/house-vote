import type { ListingType } from 'db';
import { Hotel, Home, Building2, TreePine, Palmtree, MapPin } from 'lucide-react';
import { Badge } from '@/ui/shadcn/badge';
import { cn } from '@/ui/utils/cn';
import { LISTING_TYPE_LABELS } from '../listingTypeOptions';

interface ListingTypeBadgeProps {
  type: ListingType | null | undefined;
  /**
   * When true (default), renders nothing for HOUSE/OTHER/null/undefined so the
   * badge only surfaces for "interesting" types. Set to false to always render
   * the badge (e.g. in an admin table where the type should always be visible).
   */
  hideForHouse?: boolean;
  className?: string;
}

const TYPE_ICON: Record<ListingType, typeof Home> = {
  HOUSE: Home,
  HOTEL: Hotel,
  APARTMENT: Building2,
  CABIN: TreePine,
  RESORT: Palmtree,
  OTHER: MapPin,
};

/**
 * Small pill showing a listing's lodging type (Hotel, Cabin, Resort, etc.).
 * Rendered alongside the source badge. By default it hides itself for plain
 * houses to reduce visual noise on the default case.
 */
export function ListingTypeBadge({
  type,
  hideForHouse = true,
  className,
}: ListingTypeBadgeProps) {
  if (type == null) return null;
  if (hideForHouse && (type === 'HOUSE' || type === 'OTHER')) return null;

  const Icon = TYPE_ICON[type];
  const label = LISTING_TYPE_LABELS[type];

  return (
    <Badge
      weight="hollow"
      className={cn(
        'flex items-center gap-1 border-slate-200 bg-slate-50 px-2 py-1 text-slate-700',
        className,
      )}
      title={label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="text-xs font-medium">{label}</span>
    </Badge>
  );
}
