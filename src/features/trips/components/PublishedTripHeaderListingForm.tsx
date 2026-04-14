'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitPublishedTripListing } from '@/features/trips/actions/publishedTripActions';
import type { PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';
import { usePublishedGuestSession } from '@/features/trips/hooks/usePublishedGuestSession';
import type { PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface PublishedTripHeaderListingFormProps {
  token: string;
  share: PublishedTripShareRecord;
  className?: string;
  initialSession?: PublishedGuestSessionValue | null;
}

export function PublishedTripHeaderListingForm({
  token,
  share,
  className,
  initialSession = null,
}: PublishedTripHeaderListingFormProps) {
  const router = useRouter();
  const { activeGuest } = usePublishedGuestSession(share.trip.id, share.guests, initialSession);
  const [listingUrl, setListingUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!share.allowGuestSuggestions || !activeGuest) {
    return null;
  }

  const activeGuestId = activeGuest.id;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    const result = await submitPublishedTripListing({
      token,
      guestId: activeGuestId,
      url: listingUrl,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to add that listing.');
      return;
    }

    setListingUrl('');
    router.refresh();
    toast.success('Listing added to the board.');
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={listingUrl}
          onChange={(event) => setListingUrl(event.target.value)}
          placeholder="https://..."
          disabled={isSubmitting}
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={isSubmitting} className="w-full shrink-0 sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add listing
        </Button>
      </div>
    </form>
  );
}
