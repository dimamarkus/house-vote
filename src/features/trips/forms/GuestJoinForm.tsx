'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@turbodima/ui/shadcn/input';
import { Button } from '@turbodima/ui/shadcn/button';
import { Label } from '@turbodima/ui/shadcn/label';
import { toast } from 'sonner';
import { joinTripAsGuest } from '../actions/joinTripAsGuest';
import { Alert, AlertDescription, AlertTitle } from '@turbodima/ui/shadcn/alert';
import { Terminal } from 'lucide-react';

interface GuestJoinFormProps {
  token: string;
}

export function GuestJoinForm({ token }: GuestJoinFormProps) {
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    // Ensure token is included in formData
    formData.set('token', token);

    const result = await joinTripAsGuest(formData);

    // Check success flag first
    if (result.success) {
      // Check if data exists and is not an array (shouldn't be for this action)
      if (result.data && !Array.isArray(result.data)) {
        const { tripId: returnedTripId, guestName } = result.data;
        // Set local storage
        try {
          const guestSessionKey = `housevote_guest_session_${returnedTripId}`;
          const sessionData = JSON.stringify({ token, displayName: guestName });
          localStorage.setItem(guestSessionKey, sessionData);
          toast.success('Welcome!', { description: `You've joined the trip as ${guestName}.` });
          router.push(`/trips/${returnedTripId}`);
        } catch (lsError) {
          console.error('Failed to store guest session locally:', lsError);
          toast.error('Joined trip, but failed to save session locally.');
          router.push(`/trips/${returnedTripId}`); // Still redirect
        }
      } else {
        // Handle unexpected success response format
        setError('Unexpected response from server.');
        setIsLoading(false);
      }
    } else {
      // Handle errors from server action (result.success is false)
      // Ensure we pass only the error message string to setError
      const errorMessage = typeof result.error === 'string' ? result.error : 'An unknown processing error occurred.';
      setError(errorMessage);

      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter your name to join this trip as a guest. Your name will be visible to others on the trip.
      </p>

      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1">
        <Label htmlFor="displayName">Your Name</Label>
        <Input
          id="displayName"
          name="displayName" // Add name attribute for FormData
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your name"
          required
          disabled={isLoading}
          aria-invalid={!!fieldErrors?.displayName}
          aria-describedby={fieldErrors?.displayName ? "displayName-error" : undefined}
        />
        {fieldErrors?.displayName && (
          <p id="displayName-error" className="text-sm text-destructive">
            {fieldErrors.displayName.join(', ')}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Joining...' : 'Join Trip'}
        </Button>
      </div>
    </form>
  );
}