'use client';

import { useState } from 'react';
import { Button } from '@turbodima/ui/shadcn/button';
import { Input } from '@turbodima/ui/shadcn/input';
import { Form } from '@turbodima/ui/form/Form';
import { FormField } from '@turbodima/ui/form/FormField';
import { createInvitation } from '../actions/createInvitation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTrigger, DialogTitle } from '@turbodima/ui/shadcn/dialog';

interface InviteCollaboratorFormProps {
  tripId: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function InviteCollaboratorForm({ tripId, onCancel, onSuccess }: InviteCollaboratorFormProps) {
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
    onCancel?.();
  };

  const handleInvitationCreated = () => {
    toast.success('Invitation sent successfully');
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button weight="hollow">Invite Collaborators</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
        </DialogHeader>
        <Form
          action={createInvitation}
          successMessage="Invitation sent successfully"
          errorMessage="Failed to send invitation"
          onSuccess={handleInvitationCreated}
        >
          <input type="hidden" name="tripId" value={tripId} />
          <FormField
            label="Email Address"
            name="email"
            required
          >
            <Input
              type="email"
              placeholder="collaborator@example.com"
              required
            />
          </FormField>
          <div className="flex justify-end space-x-2 mt-4">
            <Button weight="hollow" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              Send Invitation
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}