'use client';

import { useState, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { errorToString } from '@/core/errors';
import { refreshListingFromSourceUrl } from '@/features/listings/actions/refreshListingFromSourceUrl';
import { Button } from '@/ui/shadcn/button';
import { cn } from '@/ui/utils/cn';

interface RefreshListingFromSourceButtonProps {
  listingId: string;
  disabled?: boolean;
  className?: string;
  size?: ComponentProps<typeof Button>['size'];
  weight?: ComponentProps<typeof Button>['weight'];
  variant?: ComponentProps<typeof Button>['variant'];
  /** Fires when the user starts a refresh (e.g. close a parent menu). */
  onRefreshStart?: () => void;
}

export function RefreshListingFromSourceButton({
  listingId,
  disabled = false,
  className,
  size = 'sm',
  weight = 'hollow',
  variant = 'neutral',
  onRefreshStart,
}: RefreshListingFromSourceButtonProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    onRefreshStart?.();
    setIsRefreshing(true);
    toast.loading('Refreshing from source…');

    try {
      const result = await refreshListingFromSourceUrl({ listingId });

      toast.dismiss();

      if (!result.success) {
        toast.error(errorToString(result.error || 'Refresh failed'));
        return;
      }

      if (!result.data) {
        toast.error('Refresh finished without listing data.');
        return;
      }

      const missingFields = result.data.missingFields ?? [];
      const successMessage =
        missingFields.length > 0
          ? `Updated "${result.data.listingTitle}". Still missing: ${missingFields.join(', ')}.`
          : `Updated "${result.data.listingTitle}".`;

      toast.success(successMessage);
      router.refresh();
    } catch (error) {
      toast.dismiss();
      toast.error(errorToString(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      weight={weight}
      variant={variant}
      className={cn('gap-1.5', className)}
      disabled={disabled || isRefreshing}
      onClick={handleRefresh}
      title="Re-fetch title, description, photos, and other fields from the listing URL"
    >
      <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
      {isRefreshing ? 'Refreshing…' : 'Refresh from source'}
    </Button>
  );
}
