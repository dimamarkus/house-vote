'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@turbodima/ui/shadcn/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@turbodima/ui/shadcn/card';
import { Badge } from '@turbodima/ui/shadcn/badge';
import { Users, UserPlus, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { InviteCollaboratorForm } from '../forms/InviteCollaboratorForm';
import { Button } from '@turbodima/ui/shadcn/button';
import { Input } from '@turbodima/ui/shadcn/input';
import { toast } from 'sonner';
import { generateShareableInvite } from '../actions/generateShareableInvite';
import { useUser } from '@clerk/nextjs';

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
}

export function CollaboratorsList({
  tripId,
  owner,
  collaborators,
  guestNames,
  currentGuestName,
  isOwner
}: CollaboratorsListProps) {
  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Add state for owner details, initialized from props
  const [ownerDetails, setOwnerDetails] = useState({
    ...owner, // Initialize with whatever is passed
    name: owner.name || 'Trip Owner', // Use placeholder if prop is null
    email: owner.email || null,
    image: owner.image || null,
  });

  // Re-add useUser hook
  const { isLoaded, user } = useUser();

  // Re-add effect to update owner details if current user is the owner
  useEffect(() => {
    if (isLoaded && user && user.id === owner.id) {
      setOwnerDetails({
        id: user.id,
        name: user.fullName || 'Trip Owner', // Use Clerk full name
        email: user.primaryEmailAddress?.emailAddress || null, // Use Clerk email
        image: user.imageUrl || null, // Use Clerk image
      });
    }
    // If the owner prop itself changes (e.g., parent re-renders with new data)
    // AND the current user is NOT the owner, reset ownerDetails to the new prop value.
    else if (owner.id !== ownerDetails.id && (!user || user.id !== owner.id)) {
       setOwnerDetails({
        ...owner, // Initialize with whatever is passed
        name: owner.name || 'Trip Owner', // Use placeholder if prop is null
        email: owner.email || null,
        image: owner.image || null,
      });
    }
  }, [isLoaded, user, owner, ownerDetails.id]); // Add owner and ownerDetails.id to dependencies

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

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true);
    setShareableLink(null);
    setIsCopied(false);

    try {
      const result = await generateShareableInvite(tripId);

      if (result.success) {
        // Type assertion to help TypeScript understand the structure
        const tokenValue = (result.data as { token: string }).token;
        const link = `${window.location.origin}/invite/${tokenValue}`;
        setShareableLink(link);
        toast.success('Shareable link generated', {
          description: 'You can now copy the link below.',
        });
      } else {
        // Convert error to string to ensure it's compatible with toast
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : 'An unknown error occurred.';

        toast.error('Error generating link', {
          description: errorMessage,
        });
      }
    } catch {
      toast.error('Error generating link', {
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!shareableLink) return;
    navigator.clipboard.writeText(shareableLink).then(() => {
      setIsCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy link', {
        description: 'Could not copy link to clipboard.',
      });
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Collaborators</CardTitle>
        <CardDescription>People with access to this trip</CardDescription>
          {isOwner && (
            <div className="flex flex-row items-center justify-between mt-2 gap-2">
              <Button
                onClick={handleGenerateLink}
                weight="hollow"
                size="sm"
                disabled={isGeneratingLink}
                className="w-1/2"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {isGeneratingLink ? 'Generating...' : 'Get Share Link'}
              </Button>
              <Button
                onClick={() => setIsInviteFormOpen(true)}
                weight="hollow"
                size="sm"
                className="w-1/2"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite by Email
              </Button>
            </div>
          )}
      </CardHeader>
      <CardContent>
        {/* Shareable Link Display */}
        {shareableLink && (
          <div className="flex gap-2 mb-4 p-3 bg-muted rounded-md items-center">
            <Input value={shareableLink} readOnly className="flex-1" />
            <Button onClick={handleCopyLink} weight="ghost" size="icon">
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              <span className="sr-only">Copy link</span>
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {/* Owner */}
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={ownerDetails.image || ''} />
              <AvatarFallback>{getInitials(ownerDetails.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{ownerDetails.name}</p>
              <p className="text-sm text-muted-foreground">{ownerDetails.email || 'No email'}</p>
            </div>
            <Badge>Owner</Badge>
          </div>

          {/* Collaborators */}
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

          {/* Guests */}
          {guestNames.length > 0 && (
            guestNames.map((guestName, index) => (
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
          )}

          {/* Show current guest if they exist and aren't already in the fetched guestNames list */}
          {currentGuestName && !guestNames.includes(currentGuestName) && (
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

          {/* Show message only if collaborators, fetched guests, AND current guest are absent */}
          {collaborators.length === 0 && guestNames.length === 0 && !currentGuestName && (
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