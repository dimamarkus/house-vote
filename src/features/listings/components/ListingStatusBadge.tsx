import { XCircle } from 'lucide-react';
import { Badge, type BadgeProps } from '@/ui/shadcn/badge';
import { cn } from '@/ui/utils/cn';
import {
  formatListingStatusLabel,
  LISTING_STATUS,
  type ListingStatusValue,
} from '@/features/listings/constants/listing-status';

export function getListingStatusBadgeVariant(status: ListingStatusValue): BadgeProps['variant'] {
  switch (status) {
    case LISTING_STATUS.REJECTED:
      return 'destructive';
    default:
      return 'secondary';
  }
}

function ListingStatusIcon({ status }: { status: ListingStatusValue }) {
  switch (status) {
    case LISTING_STATUS.REJECTED:
      return <XCircle className="h-4 w-4 mr-1" />;
    default:
      return null;
  }
}

interface ListingStatusBadgeProps {
  status: ListingStatusValue;
  className?: string;
}

export function ListingStatusBadge({ status, className }: ListingStatusBadgeProps) {
  return (
    <Badge
      variant={getListingStatusBadgeVariant(status)}
      className={cn('flex items-center shadow-sm', className)}
    >
      <ListingStatusIcon status={status} />
      {formatListingStatusLabel(status)}
    </Badge>
  );
}
