'use client';

import { Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/shadcn/card';
import { CollaboratorsInviteForms } from './CollaboratorsInviteForms';
import { CollaboratorsRoster } from './CollaboratorsRoster';
import type { OwnerTripShareSummary } from '../types';

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
  publishedShareSummary?: Pick<OwnerTripShareSummary, 'share' | 'guests'>;
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
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isOwner ? <CollaboratorsInviteForms tripId={tripId} /> : null}
          <CollaboratorsRoster
            tripId={tripId}
            owner={owner}
            collaborators={collaborators}
            guestNames={guestNames}
            currentGuestName={currentGuestName}
            isOwner={isOwner}
            publishedShareSummary={publishedShareSummary}
          />
        </div>
      </CardContent>
    </Card>
  );
}
