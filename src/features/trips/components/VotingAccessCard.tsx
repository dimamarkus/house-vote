'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  publishTripShare,
  rotateTripShareToken,
  unpublishTripShare,
  updateTripShareSettings,
} from '@/features/trips/actions/publishedTripActions';
import { Badge } from '@/ui/shadcn/badge';
import { Button } from '@/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { Input } from '@/ui/shadcn/input';
import { toast } from 'sonner';
import { Copy, ExternalLink, Globe, Lock, RotateCcw, Unlock, Vote } from 'lucide-react';

interface VotingAccessCardProps {
  tripId: string;
  share: {
    token: string;
    isPublished: boolean;
    votingOpen: boolean;
    allowGuestSuggestions: boolean;
  } | null;
}

export function VotingAccessCard({ tripId, share }: VotingAccessCardProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const shareUrl = share
    ? (typeof window === 'undefined' ? `/share/${share.token}` : `${window.location.origin}/share/${share.token}`)
    : '';

  async function refreshAfterSuccess() {
    router.refresh();
  }

  async function handlePublishToggle() {
    setPendingAction('publish');

    const result = share?.isPublished
      ? await unpublishTripShare({ tripId })
      : await publishTripShare({ tripId });

    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to update published voting.');
      return;
    }

    toast.success(share?.isPublished ? 'Published voting hidden.' : 'Published voting is live.');
    await refreshAfterSuccess();
  }

  async function handleVotingToggle() {
    if (!share) {
      return;
    }

    setPendingAction('voting');
    const result = await updateTripShareSettings({
      tripId,
      votingOpen: !share.votingOpen,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to update voting status.');
      return;
    }

    toast.success(result.data.votingOpen ? 'Voting reopened.' : 'Voting closed.');
    await refreshAfterSuccess();
  }

  async function handleGuestSuggestionToggle() {
    if (!share) {
      return;
    }

    setPendingAction('suggestions');
    const result = await updateTripShareSettings({
      tripId,
      allowGuestSuggestions: !share.allowGuestSuggestions,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to update guest suggestions.');
      return;
    }

    toast.success(result.data.allowGuestSuggestions ? 'Guest suggestions enabled.' : 'Guest suggestions disabled.');
    await refreshAfterSuccess();
  }

  async function handleRotateLink() {
    setPendingAction('rotate');
    const result = await rotateTripShareToken({ tripId });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to rotate published link.');
      return;
    }

    toast.success('Published link rotated.');
    await refreshAfterSuccess();
  }

  async function handleCopyLink() {
    if (!share) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${share.token}`);
      toast.success('Published link copied.');
    } catch {
      toast.error('Failed to copy the published link.');
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Voting
        </CardTitle>
        <CardDescription>
          Control the public voting page, share link, and whether guests can keep adding listings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handlePublishToggle} disabled={pendingAction === 'publish'} size="sm">
            <Vote className="mr-2 h-4 w-4" />
            {share?.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
          <Button
            weight="hollow"
            onClick={handleVotingToggle}
            disabled={!share || pendingAction === 'voting'}
            size="sm"
          >
            {share?.votingOpen ? <Lock className="mr-2 h-4 w-4" /> : <Unlock className="mr-2 h-4 w-4" />}
            {share?.votingOpen ? 'Close voting' : 'Open voting'}
          </Button>
          <Button
            weight="hollow"
            onClick={handleGuestSuggestionToggle}
            disabled={!share || pendingAction === 'suggestions'}
            size="sm"
          >
            {share?.allowGuestSuggestions ? 'Disable guest listings' : 'Enable guest listings'}
          </Button>
          <Button
            weight="hollow"
            onClick={handleRotateLink}
            disabled={!share || pendingAction === 'rotate'}
            size="sm"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Rotate link
          </Button>
        </div>

        {share ? (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Published link</p>
                <p className="text-xs text-muted-foreground">
                  {share.isPublished ? 'Guests can open this link right now.' : 'The link exists, but voting is currently unpublished.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant={share.isPublished ? 'primary' : 'secondary'}>
                  {share.isPublished ? 'Live' : 'Hidden'}
                </Badge>
                <Badge variant={share.votingOpen ? 'secondary' : 'destructive'}>
                  {share.votingOpen ? 'Voting open' : 'Voting closed'}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly />
              <Button weight="hollow" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy share link</span>
              </Button>
              <Button asChild weight="hollow">
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">Open shared page</span>
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Publish voting to create a share link for guests.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
