'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/ui/shadcn/button';
import { Input } from '@/ui/shadcn/input';
import { Form } from '@/ui/form/Form';
import { addPublishedTripGuest } from '../actions/publishedTripActions';
import { createInvitation } from '../actions/createInvitation';

interface CollaboratorsInviteFormsProps {
  tripId: string;
}

export function CollaboratorsInviteForms({ tripId }: CollaboratorsInviteFormsProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [isAddingGuest, setIsAddingGuest] = useState(false);

  function handleInvitationCreated() {
    toast.success('Invitation sent successfully');
  }

  async function handleAddGuest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsAddingGuest(true);
    const result = await addPublishedTripGuest({ tripId, displayName });
    setIsAddingGuest(false);

    if (!result.success) {
      toast.error(typeof result.error === 'string' ? result.error : 'Unable to add guest.');
      return;
    }

    setDisplayName('');
    toast.success(`Added ${result.data.guestDisplayName}.`);
    router.refresh();
  }

  return (
    <>
      <Form
        action={createInvitation}
        className="space-y-2"
        errorMessage="Failed to send invitation"
        onSuccess={handleInvitationCreated}
        resetOnSuccess
      >
        {(formState) => (
          <>
            <input type="hidden" name="tripId" value={tripId} />
            <p className="text-sm font-medium">Invite collaborator</p>
            <div className="flex gap-2">
              <Input
                name="email"
                type="email"
                placeholder="collaborator@example.com"
                disabled={formState.isSubmitting}
                aria-invalid={Boolean(formState.fieldErrors?.email?.[0])}
              />
              <Button type="submit" disabled={formState.isSubmitting}>
                Invite
              </Button>
            </div>
            {formState.fieldErrors?.email?.[0] ? (
              <p className="text-sm text-destructive">{formState.fieldErrors.email[0]}</p>
            ) : null}
          </>
        )}
      </Form>

      <form onSubmit={handleAddGuest} className="space-y-2">
        <p className="text-sm font-medium">Add guests</p>
        <div className="flex gap-2">
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Add guest name"
            disabled={isAddingGuest}
          />
          <Button type="submit" disabled={isAddingGuest}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Guests cannot add themselves. If someone is missing, add their name here before sharing the link.
        </p>
      </form>
    </>
  );
}
