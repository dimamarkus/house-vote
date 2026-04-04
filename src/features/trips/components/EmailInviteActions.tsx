import { Button } from "@/ui/shadcn/button";
import { handleInvitation } from "../actions/acceptInvitation";

interface EmailInviteActionsProps {
  token: string;
}

/**
 * Renders the Accept/Decline buttons as forms for email-based invitations.
 */
export async function EmailInviteActions({ token }: EmailInviteActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <form>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="accept" value="false" />
        <Button
          type="submit"
          weight="hollow"
          formAction={handleInvitation}
        >
          Decline
        </Button>
      </form>
      <form>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="accept" value="true" />
        <Button
          type="submit"
          formAction={handleInvitation}
        >
          Accept Invitation
        </Button>
      </form>
    </div>
  );
}