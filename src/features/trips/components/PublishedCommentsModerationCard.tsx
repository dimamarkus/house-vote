'use client';

import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Eye, EyeOff, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { setPublishedTripCommentHidden } from '@/features/trips/actions/publishedTripActions';
import { Badge } from '@/ui/shadcn/badge';
import { Button } from '@/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { toast } from 'sonner';

interface PublishedCommentsModerationCardProps {
  tripId: string;
  comments: Array<{
    id: string;
    body: string;
    createdAt: Date;
    hiddenAt: Date | null;
    guest: {
      id: string;
      guestDisplayName: string;
    };
    listing: {
      id: string;
      title: string;
    };
  }>;
}

export function PublishedCommentsModerationCard({
  tripId,
  comments,
}: PublishedCommentsModerationCardProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const summary = useMemo(() => {
    const hiddenCount = comments.filter((comment) => comment.hiddenAt !== null).length;

    return {
      total: comments.length,
      hidden: hiddenCount,
      visible: comments.length - hiddenCount,
    };
  }, [comments]);

  async function handleHiddenToggle(commentId: string, hidden: boolean) {
    setPendingAction(commentId);
    const result = await setPublishedTripCommentHidden({
      tripId,
      commentId,
      hidden,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to update comment visibility.');
      return;
    }

    router.refresh();
    toast.success(hidden ? 'Comment hidden from guests.' : 'Comment restored.');
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Public comments
        </CardTitle>
        <CardDescription>
          Moderate guest comments from the published voting page without deleting them permanently.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{summary.total} total</Badge>
          <Badge variant="secondary">{summary.visible} visible</Badge>
          <Badge variant="secondary">{summary.hidden} hidden</Badge>
        </div>

        {comments.length > 0 ? (
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {comments.map((comment) => {
              const isHidden = comment.hiddenAt !== null;
              const isPending = pendingAction === comment.id;

              return (
                <div key={comment.id} className="rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{comment.guest.guestDisplayName}</p>
                        <Badge weight={isHidden ? 'hollow' : 'solid'} variant="secondary">
                          {isHidden ? 'Hidden' : 'Visible'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        On {comment.listing.title} • {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      weight="hollow"
                      disabled={isPending}
                      onClick={() => handleHiddenToggle(comment.id, !isHidden)}
                    >
                      {isHidden ? (
                        <>
                          <Eye className="h-4 w-4" />
                          Restore
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Hide
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{comment.body}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No public comments yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
