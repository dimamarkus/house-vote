'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/shadcn/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/ui/shadcn/card';
import { Badge } from '@/ui/shadcn/badge';
import { Users, UserPlus, Plus, Trash2 } from 'lucide-react';
import { InviteCollaboratorForm } from '../forms/InviteCollaboratorForm';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  addPublishedTripGuest,
  removePublishedTripGuest,
} from '../actions/publishedTripActions';

interface CollaboratorsListProps {
  tripId: string;
  owner: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  collaborators: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }[];
  guestNames: string[];
  currentGuestName: string | null;
  isOwner: boolean;
  publishedShareSummary?: {
    share: {
      token: string;
      isPublished: boolean;
      votingOpen: boolean;
      allowGuestSuggestions: boolean;
    } | null;
    listings: Array<{
      id: string;
      title: string;
      status: string;
    }>;
    guests: Array<{
      id: string;
      guestDisplayName: string;
      source: 'OWNER_ADDED' | 'SELF_ADDED';
      votes: Array<{
        listingId: string;
      }>;
    }>;
  };
}

export function CollaboratorsList({
  tripId,
  owner,
  collaborators,
  guestNames,
  currentGuestName,
  isOwner,
  publishedShareSummary,
}: CollaboratorsListProps) {
  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const votedBadgeClassName = 'bg-teal-50 text-teal-700';
  const ownerBadgeClassName = 'bg-amber-50 text-amber-700';

  // Re-add useUser hook
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

  // Get initials for fallback avatar
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  async function refreshAfterSuccess() {
    window.location.reload();
  }

  async function handleAddGuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPendingAction('add-guest');
    const result = await addPublishedTripGuest({
      tripId,
      displayName,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to add guest.');
      return;
    }

    setDisplayName('');
    toast.success(`Added ${result.data.guestDisplayName}.`);
    await refreshAfterSuccess();
  }

  async function handleRemoveGuest(guestId: string, guestDisplayName: string) {
    setPendingAction(`remove-${guestId}`);
    const result = await removePublishedTripGuest({
      tripId,
      guestId,
    });
    setPendingAction(null);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to remove guest.');
      return;
    }

    toast.success(`Removed ${guestDisplayName}.`);
    await refreshAfterSuccess();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {isOwner ? 'Guests' : 'Collaborators'}
        </CardTitle>
        <CardDescription>
          {isOwner
            ? 'Manage the guest list, see who has voted, and invite collaborators by email.'
            : 'People with access to this trip'}
        </CardDescription>
          {isOwner && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setIsInviteFormOpen(true)}
                weight="hollow"
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite by Email
              </Button>
            </div>
          )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isOwner ? (
            <form onSubmit={handleAddGuest} className="space-y-2">
              <p className="text-sm font-medium">Add guests</p>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Add guest name"
                  disabled={pendingAction === 'add-guest'}
                />
                <Button type="submit" disabled={pendingAction === 'add-guest'}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Guests can also add themselves from the public page if their name is missing.
              </p>
            </form>
          ) : null}

          {/* Published guests with vote state */}
          {publishedGuests.length > 0 ? (
            publishedGuests.map((guest) => {
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
                        className={hasVoted ? votedBadgeClassName : undefined}
                      >
                        {hasVoted ? 'Voted' : 'Waiting'}
                      </Badge>
                      {guest.source === 'SELF_ADDED' ? <Badge weight="hollow">Self added</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Guest
                    </p>
                  </div>
                  {isOwner ? (
                    <Button
                      weight="ghost"
                      size="icon"
                      onClick={() => handleRemoveGuest(guest.id, guest.guestDisplayName)}
                      disabled={pendingAction === `remove-${guest.id}`}
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
          ) : guestNames.length > 0 ? (
            guestNames
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
          ) : null}

          {/* Show current guest if they exist and aren't already in the fetched guestNames list */}
          {currentGuestName && !guestNames.includes(currentGuestName) && !publishedGuestNames.has(currentGuestName) && (
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

          {(ownerDetails || collaborators.length > 0) && isOwner ? (
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
                <Badge variant="secondary" className={ownerBadgeClassName}>Owner</Badge>
              </div>

              {collaborators.length > 0 ? (
                collaborators.map((collaborator) => (
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
              ) : null}
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
              <Badge variant="secondary" className={ownerBadgeClassName}>Owner</Badge>
            </div>
          )}

          {/* Show message only if collaborators, fetched guests, AND current guest are absent */}
          {collaborators.length === 0 && guestNames.length === 0 && publishedGuests.length === 0 && !currentGuestName && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Users className="h-5 w-5 mr-2" />
              <span>No collaborators or guests yet</span>
            </div>
          )}

          {/* Invite form */}
          {isInviteFormOpen && (
            <div className="pt-4 border-t">
              <InviteCollaboratorForm
                tripId={tripId}
                onCancel={() => setIsInviteFormOpen(false)}
                onSuccess={() => setIsInviteFormOpen(false)}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}