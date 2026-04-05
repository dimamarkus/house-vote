'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import {
  castPublishedTripVote,
  claimPublishedTripGuest,
  createPublishedTripGuest,
  submitPublishedTripListing,
} from '@/features/trips/actions/publishedTripActions';
import {
  formatListingStatusLabel,
  isVoteEligibleListingStatus,
} from '@/features/listings/constants/listing-status';
import { getPublishedGuestSessionKey, type PublishedGuestSessionValue } from '@/features/trips/constants/publishedGuestSession';
import type { PublishedTripListingRecord, PublishedTripShareRecord } from '@/features/trips/publishedDb';
import { ListingCard, type ListingCardProps } from '@/features/listings/components/ListingCard';
import { Badge } from '@/ui/shadcn/badge';
import { Button } from '@/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { Input } from '@/ui/shadcn/input';
import { cn } from '@/ui/utils/cn';
import { toast } from 'sonner';
import { Heart, Plus, RefreshCcw, Users } from 'lucide-react';

interface PublishedTripPageClientProps {
  token: string;
  share: PublishedTripShareRecord;
  listings: PublishedTripListingRecord[];
}

const PUBLISHED_GUEST_SESSION_EVENT = 'housevote-published-guest-session-change';

function buildGuestSessionValue(guestId: string, guestDisplayName: string): PublishedGuestSessionValue {
  return {
    guestId,
    guestDisplayName,
  };
}

function parsePublishedGuestSession(rawValue: string | null): PublishedGuestSessionValue | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as PublishedGuestSessionValue;
    if (!parsed.guestId || !parsed.guestDisplayName) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function readPublishedGuestSessionSnapshot(sessionKey: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(sessionKey);
}

function publishGuestSessionChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PUBLISHED_GUEST_SESSION_EVENT));
  }
}

function clearPublishedGuestSession(sessionKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(sessionKey);
    publishGuestSessionChange();
  }
}

function subscribeToPublishedGuestSession(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleChange = () => onStoreChange();

  window.addEventListener('storage', handleChange);
  window.addEventListener(PUBLISHED_GUEST_SESSION_EVENT, handleChange);

  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(PUBLISHED_GUEST_SESSION_EVENT, handleChange);
  };
}

export function PublishedTripPageClient({
  token,
  share,
  listings,
}: PublishedTripPageClientProps) {
  const router = useRouter();
  const sessionKey = getPublishedGuestSessionKey(share.trip.id);
  const rawSession = useSyncExternalStore(
    subscribeToPublishedGuestSession,
    () => readPublishedGuestSessionSnapshot(sessionKey),
    () => null,
  );
  const session = useMemo(() => parsePublishedGuestSession(rawSession), [rawSession]);
  const [displayName, setDisplayName] = useState('');
  const [listingUrl, setListingUrl] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router]);

  const activeGuest = useMemo(() => {
    if (!session) {
      return null;
    }

    return share.guests.find((guest) => guest.id === session.guestId) ?? null;
  }, [session, share.guests]);

  useEffect(() => {
    if (rawSession && !session) {
      clearPublishedGuestSession(sessionKey);
    }
  }, [rawSession, session, sessionKey]);

  useEffect(() => {
    if (session && !activeGuest) {
      clearPublishedGuestSession(sessionKey);
      toast.error('Your guest session is no longer available. Please pick your name again.');
    }
  }, [activeGuest, session, sessionKey]);

  const sortedListings = useMemo(() => {
    return [...listings].sort((left, right) => {
      const leftIsVoteEligible = isVoteEligibleListingStatus(left.status);
      const rightIsVoteEligible = isVoteEligibleListingStatus(right.status);

      if (leftIsVoteEligible !== rightIsVoteEligible) {
        return leftIsVoteEligible ? -1 : 1;
      }

      if (right.votes.length !== left.votes.length) {
        return right.votes.length - left.votes.length;
      }

      return left.title.localeCompare(right.title);
    });
  }, [listings]);

  const currentWinnerListingId = useMemo(() => {
    return sortedListings.find((listing) => (
      isVoteEligibleListingStatus(listing.status) && listing.votes.length > 0
    ))?.id ?? null;
  }, [sortedListings]);

  const currentVoteListingId = activeGuest?.votes[0]?.listingId ?? null;

  function persistSession(nextSession: PublishedGuestSessionValue) {
    localStorage.setItem(sessionKey, JSON.stringify(nextSession));
    publishGuestSessionChange();
  }

  function clearSession() {
    clearPublishedGuestSession(sessionKey);
  }

  async function handlePickGuest(guestId: string) {
    setPendingAction(`pick-${guestId}`);
    const result = await claimPublishedTripGuest({
      token,
      guestId,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to use that guest name.');
      return;
    }

    persistSession(buildGuestSessionValue(result.data.guestId, result.data.guestDisplayName));
    toast.success(`You joined as ${result.data.guestDisplayName}.`);
  }

  async function handleCreateGuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPendingAction('create-guest');
    const result = await createPublishedTripGuest({
      token,
      displayName,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to add your name.');
      return;
    }

    const nextSession = buildGuestSessionValue(result.data.guestId, result.data.guestDisplayName);
    setDisplayName('');
    persistSession(nextSession);
    router.refresh();
    toast.success(`You joined as ${result.data.guestDisplayName}.`);
  }

  async function handleVote(listingId: string) {
    if (!activeGuest) {
      return;
    }

    setPendingAction(`vote-${listingId}`);
    const result = await castPublishedTripVote({
      token,
      guestId: activeGuest.id,
      listingId,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to cast your vote.');
      return;
    }

    router.refresh();
    toast.success(currentVoteListingId === listingId ? 'Your vote is still here.' : 'Vote updated.');
  }

  async function handleSubmitListing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeGuest) {
      return;
    }

    setPendingAction('submit-listing');
    const result = await submitPublishedTripListing({
      token,
      guestId: activeGuest.id,
      url: listingUrl,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to add that listing.');
      return;
    }

    setListingUrl('');
    router.refresh();
    toast.success('Listing added to the board.');
  }

  if (!activeGuest) {
    return (
      <div className="flex w-full flex-col gap-6">
        <Card className="border-primary/15">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">Step 1</Badge>
              <Badge weight="hollow">Required</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl sm:text-3xl">Choose your name to continue</CardTitle>
              <CardDescription className="text-base">
                This is the first thing every guest has to do. Your name will be attached to your vote so everyone can see it live.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Pick your name</p>
                <p className="text-sm text-muted-foreground">
                  Tap your name below to enter the voting page.
                </p>
              </div>
              {share.guests.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {share.guests.map((guest) => (
                    <Button
                      key={guest.id}
                      weight="hollow"
                      onClick={() => handlePickGuest(guest.id)}
                      disabled={pendingAction === `pick-${guest.id}`}
                      className="h-auto min-h-20 w-full justify-start rounded-xl px-4 py-4 text-left"
                    >
                      <span className="flex flex-col items-start gap-1">
                        <span className="text-base font-semibold">{guest.guestDisplayName}</span>
                        <span className="text-xs text-muted-foreground">
                          Continue as {guest.guestDisplayName}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No names are on the guest list yet. Add yourself on the right to get started.
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">My name isn&apos;t here</p>
                  <p className="text-sm text-muted-foreground">
                    Add yourself if the trip owner has not listed you yet.
                  </p>
                </div>
                <form onSubmit={handleCreateGuest} className="space-y-3">
                  <Input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Enter your name"
                    disabled={pendingAction === 'create-guest'}
                  />
                  <Button type="submit" disabled={pendingAction === 'create-guest'} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Join voting
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          Voting as <strong className="text-foreground">{activeGuest.guestDisplayName}</strong>
        </span>
        <Button weight="ghost" size="sm" onClick={clearSession}>
          Switch name
        </Button>
      </div>

      {share.allowGuestSuggestions ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a listing</CardTitle>
            <CardDescription>Paste an Airbnb or Vrbo URL and it will appear on the board for everyone.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitListing} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={listingUrl}
                onChange={(event) => setListingUrl(event.target.value)}
                placeholder="https://..."
                disabled={pendingAction === 'submit-listing'}
              />
              <Button type="submit" disabled={pendingAction === 'submit-listing'}>
                <Plus className="mr-2 h-4 w-4" />
                Add listing
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {sortedListings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {sortedListings.map((listing) => {
            const voterNames = listing.votes.map((vote) => vote.guest.guestDisplayName);
            const isVoteEligible = isVoteEligibleListingStatus(listing.status);
            const isCurrentVote = currentVoteListingId === listing.id;
            const isCurrentWinner = currentWinnerListingId === listing.id;
            const voteButtonLabel = !share.votingOpen
              ? 'Voting closed'
              : !isVoteEligible
                ? (isCurrentVote ? 'Your vote' : formatListingStatusLabel(listing.status))
              : isCurrentVote
                ? 'Your vote'
                : currentVoteListingId
                  ? 'Move my vote here'
                  : 'Vote for this house';

            return (
              <ListingCard
                key={listing.id}
                listing={listing}
                roomBreakdown={listing.roomBreakdown as ListingCardProps['roomBreakdown']}
                className={isCurrentWinner ? 'border-emerald-200 shadow-sm' : undefined}
                imageOverlayContent={
                  isCurrentWinner ? (
                    <Badge className="bg-emerald-600 text-white shadow-sm">
                      Current winner
                    </Badge>
                  ) : undefined
                }
                footerContent={
                  <div className="flex w-full flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">Votes</span>
                        <div className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          <span>{listing.votes.length}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleVote(listing.id)}
                        disabled={!share.votingOpen || !isVoteEligible || pendingAction === `vote-${listing.id}`}
                        weight="ghost"
                        size="icon"
                        aria-label={voteButtonLabel}
                        aria-pressed={isCurrentVote}
                        title={voteButtonLabel}
                        className={cn(
                          'rounded-full border',
                          isCurrentVote
                            ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {pendingAction === `vote-${listing.id}` ? (
                          <RefreshCcw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Heart className={cn('h-4 w-4', isCurrentVote ? 'fill-current' : 'fill-none')} />
                        )}
                        <span className="sr-only">{voteButtonLabel}</span>
                      </Button>
                    </div>
                    <div className="flex min-h-9 flex-wrap gap-2">
                      {voterNames.length > 0 ? (
                        voterNames.map((voterName) => (
                          <Badge key={`${listing.id}-${voterName}`} variant="secondary">
                            {voterName}
                          </Badge>
                        ))
                      ) : null}
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No homes are on the board yet. Add one to get voting started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
