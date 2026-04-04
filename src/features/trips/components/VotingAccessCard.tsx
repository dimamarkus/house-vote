'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  publishTripShare,
  rotateTripShareToken,
  unpublishTripShare,
  updateTripShareSettings,
} from '@/features/trips/actions/publishedTripActions';
import { Button } from '@/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { Input } from '@/ui/shadcn/input';
import { cn } from '@/ui/utils/cn';
import { toast } from 'sonner';
import { Copy, ExternalLink, Globe, RotateCcw } from 'lucide-react';

interface VotingAccessCardProps {
  tripId: string;
  share: {
    token: string;
    isPublished: boolean;
    votingOpen: boolean;
    allowGuestSuggestions: boolean;
  } | null;
}

interface VotingSettingRowProps {
  title: string;
  checked: boolean;
  disabled?: boolean;
  pending?: boolean;
  onToggle: () => void;
}

function VotingSettingRow({
  title,
  checked,
  disabled = false,
  pending = false,
  onToggle,
}: VotingSettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          checked
            ? 'border-emerald-300 bg-emerald-100'
            : 'border-border bg-muted'
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-background shadow-sm transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
        <span className="sr-only">
          {pending ? `Updating ${title}` : `Toggle ${title}`}
        </span>
      </button>
    </div>
  );
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
          Control the public voting page and whether guests can cast votes right now.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <VotingSettingRow
            title="Public voting page"
            checked={Boolean(share?.isPublished)}
            disabled={pendingAction === 'publish'}
            pending={pendingAction === 'publish'}
            onToggle={handlePublishToggle}
          />
          <VotingSettingRow
            title="Voting open"
            checked={Boolean(share?.votingOpen)}
            disabled={!share || pendingAction === 'voting'}
            pending={pendingAction === 'voting'}
            onToggle={handleVotingToggle}
          />
        </div>

        {share ? (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Published link</p>
                <p className="text-xs text-muted-foreground">
                  Share this URL with guests. Rotating the link will invalidate the current one.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  weight="hollow"
                  onClick={handleRotateLink}
                  disabled={pendingAction === 'rotate'}
                  size="sm"
                >
                  <RotateCcw className="h-4 w-4" />
                  Rotate link
                </Button>
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
            Turn on the public voting page to create a share link for guests.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
