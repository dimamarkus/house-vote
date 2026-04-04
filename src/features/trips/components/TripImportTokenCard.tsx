'use client';

import { useState } from 'react';
import { Copy, KeyRound, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/shadcn/card';
import { Input } from '@/ui/shadcn/input';
import { generateTripImportToken } from '../actions/generateTripImportToken';

interface TripImportTokenCardProps {
  tripId: string;
}

export function TripImportTokenCard({ tripId }: TripImportTokenCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [plainToken, setPlainToken] = useState<string | null>(null);

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const handleGenerateToken = async () => {
    setIsGenerating(true);

    try {
      const result = await generateTripImportToken(tripId);

      if (!result.success) {
        toast.error(typeof result.error === 'string' ? result.error : 'Failed to generate import token.');
        return;
      }

      const nextToken = result.data.token;
      setPlainToken(nextToken);
      toast.success('New import token generated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate import token.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Browser Import</CardTitle>
        <CardDescription>
          Use this trip id and token in the Chrome extension. Generating a new token invalidates the previous one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <p className="text-sm font-medium">Trip ID</p>
          <div className="flex gap-2">
            <Input readOnly value={tripId} />
            <Button
              onClick={() => copyValue('Trip ID', tripId)}
              size="icon"
              weight="ghost"
              title="Copy trip id"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Import Token</p>
          <div className="flex gap-2">
            <Input
              readOnly
              type="text"
              value={plainToken ?? 'Generate a token to connect the extension'}
            />
            <Button
              disabled={!plainToken}
              onClick={() => plainToken && copyValue('Import token', plainToken)}
              size="icon"
              weight="ghost"
              title="Copy import token"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={isGenerating}
          onClick={handleGenerateToken}
          weight="hollow"
        >
          {plainToken ? <RefreshCcw className="mr-2 h-4 w-4" /> : <KeyRound className="mr-2 h-4 w-4" />}
          {isGenerating ? 'Generating...' : plainToken ? 'Rotate Token' : 'Generate Token'}
        </Button>
      </CardContent>
    </Card>
  );
}
