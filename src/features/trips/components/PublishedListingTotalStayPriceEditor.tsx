'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCcw } from 'lucide-react';
import { setPublishedTripListingTotalPrice } from '@/features/trips/actions/publishedTripActions';
import type { PublishedTripGuestRecord } from '@/features/trips/publishedDb';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { cn } from '@/ui/utils/cn';
import { toast } from 'sonner';

interface PublishedListingTotalStayPriceEditorProps {
  token: string;
  listingId: string;
  currentPrice: number | null;
  activeGuest: PublishedTripGuestRecord | null;
  className?: string;
}

export function PublishedListingTotalStayPriceEditor({
  token,
  listingId,
  currentPrice,
  activeGuest,
  className,
}: PublishedListingTotalStayPriceEditorProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeGuest) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const normalizedInput = String(formData.get('totalStayPrice') ?? '').trim();

    if (!normalizedInput) {
      toast.error('Enter a total-stay price before saving.');
      return;
    }

    const parsedPrice = Number(normalizedInput);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0 || !Number.isInteger(parsedPrice)) {
      toast.error('Price must be a whole number that is zero or greater.');
      return;
    }

    setIsSubmitting(true);
    const result = await setPublishedTripListingTotalPrice({
      token,
      guestId: activeGuest.id,
      listingId,
      totalStayPrice: parsedPrice,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to update listing price.');
      return;
    }

    router.refresh();
    toast.success('Total-stay price updated.');
  }

  const helperText = activeGuest
    ? 'Guests can set the total-stay price.'
    : 'Pick a guest name to edit total-stay price.';

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-2', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="number"
          name="totalStayPrice"
          min="0"
          step="1"
          inputMode="numeric"
          defaultValue={currentPrice !== null ? String(currentPrice) : ''}
          placeholder="Total stay price"
          disabled={!activeGuest || isSubmitting}
          className="min-w-0 flex-1"
          aria-label="Total stay price"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!activeGuest || isSubmitting}
          className="w-full shrink-0 sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
              Saving
            </>
          ) : currentPrice === null ? (
            'Set price'
          ) : (
            'Update price'
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{helperText}</p>
    </form>
  );
}
