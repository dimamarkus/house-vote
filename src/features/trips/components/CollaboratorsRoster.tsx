'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Users } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/shadcn/avatar';
import { Badge } from '@/ui/shadcn/badge';
import { Button } from '@/ui/shadcn/button';
import { getInitials } from '@/ui/utils/getInitials';
import { removePublishedTripGuest } from '../actions/publishedTripActions';
import type { OwnerTripShareSummary } from '../types';

const VOTED_BADGE_CLASSNAME = 'bg-teal-50 text-teal-700';
const OWNER_BADGE_CLASSNAME = 'bg-amber-50 text-amber-700';

interface RosterPerson {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface CollaboratorsRosterProps {
  tripId: string;
  owner: RosterPerson;
  collaborators: RosterPerson[];
  guestNames: string[];
  currentGuestName: string | null;
  isOwner: boolean;
  publishedShareSummary?: Pick<OwnerTripShareSummary, 'share' | 'guests'>;
}

export function CollaboratorsRoster({
  tripId,
  owner,
  collaborators,
  guestNames,
  currentGuestName,
  isOwner,
  publishedShareSummary,
}: CollaboratorsRosterProps) {
  const router = useRouter();
  const [removingGuestId, setRemovingGuestId] = useState<string | null>(null);
  const { isLoaded, user } = useUser();

  const ownerDetails = useMemo(() => {
    if (isLoaded && user && user.id === owner.id) {
      return {
        id: user.id,
        name: user.fullName || 'Trip Owner',
        email: user.primaryEmailAddress?.emailAddress || null,
        image: user.imageUrl || null,
      };
    }

    return {
      ...owner,
      name: owner.name || 'Trip Owner',
      email: owner.email || null,
      image: owner.image || null,
    };
  }, [isLoaded, owner, user]);

  const publishedGuests = publishedShareSummary?.guests ?? [];
  const publishedGuestNames = new Set(publishedGuests.map((guest) => guest.guestDisplayName));

  async function handleRemoveGuest(guestId: string, guestDisplayName: string) {
    setRemovingGuestId(guestId);
    const result = await removePublishedTripGuest({ tripId, guestId });
    setRemovingGuestId(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to remove guest.');
      return;
    }

    toast.success(`Removed ${guestDisplayName}.`);
    router.refresh();
  }

  const hasTripTeamSection = isOwner && (ownerDetails || collaborators.length > 0);
  const isEmpty =
    collaborators.length === 0 &&
    guestNames.length === 0 &&
    publishedGuests.length === 0 &&
    !currentGuestName;

  return (
    <>
      {publishedGuests.length > 0
        ? publishedGuests.map((guest) => {
            const hasVoted = guest.votes.length > 0;

            return (
              <div key={guest.id} className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{getInitials(guest.guestDisplayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{guest.guestDisplayName}</p>
                    <Badge
                      variant="secondary"
                      className={hasVoted ? VOTED_BADGE_CLASSNAME : undefined}
                    >
                      {hasVoted ? 'Voted' : 'Waiting'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Guest</p>
                </div>
                {isOwner ? (
                  <Button
                    weight="ghost"
                    size="icon"
                    onClick={() => handleRemoveGuest(guest.id, guest.guestDisplayName)}
                    disabled={removingGuestId === guest.id}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove guest</span>
                  </Button>
                ) : (
                  <Badge variant="secondary">Guest</Badge>
                )}
              </div>
            );
          })
        : guestNames.length > 0
          ? guestNames
              .filter((guestName) => !publishedGuestNames.has(guestName))
              .map((guestName, index) => (
                <div key={`guest-${index}-${guestName}`} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(guestName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{guestName}</p>
                    <p className="text-sm text-muted-foreground">Guest</p>
                  </div>
                  <Badge variant="secondary">Guest</Badge>
                </div>
              ))
          : null}

      {currentGuestName &&
        !guestNames.includes(currentGuestName) &&
        !publishedGuestNames.has(currentGuestName) && (
          <div key={`guest-current-${currentGuestName}`} className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{getInitials(currentGuestName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{currentGuestName} (You)</p>
              <p className="text-sm text-muted-foreground">Guest</p>
            </div>
            <Badge variant="secondary">Guest</Badge>
          </div>
        )}

      {hasTripTeamSection ? (
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Trip team</p>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={ownerDetails.image || ''} />
              <AvatarFallback>{getInitials(ownerDetails.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{ownerDetails.name}</p>
              <p className="text-sm text-muted-foreground">{ownerDetails.email || 'No email'}</p>
            </div>
            <Badge variant="secondary" className={OWNER_BADGE_CLASSNAME}>
              Owner
            </Badge>
          </div>

          {collaborators.length > 0
            ? collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={collaborator.image || ''} />
                    <AvatarFallback>{getInitials(collaborator.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{collaborator.name || 'Anonymous User'}</p>
                    <p className="text-sm text-muted-foreground">{collaborator.email || 'No email'}</p>
                  </div>
                  <Badge weight="hollow">Collaborator</Badge>
                </div>
              ))
            : null}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={ownerDetails.image || ''} />
            <AvatarFallback>{getInitials(ownerDetails.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{ownerDetails.name}</p>
            <p className="text-sm text-muted-foreground">{ownerDetails.email || 'No email'}</p>
          </div>
          <Badge variant="secondary" className={OWNER_BADGE_CLASSNAME}>
            Owner
          </Badge>
        </div>
      )}

      {isEmpty && (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Users className="h-5 w-5 mr-2" />
          <span>No collaborators or guests yet</span>
        </div>
      )}
    </>
  );
}
