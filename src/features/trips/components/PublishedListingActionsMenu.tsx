'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit, EllipsisVertical, Eye } from 'lucide-react';
import type { PublishedTripGuestRecord, PublishedTripListingRecord } from '@/features/trips/publishedDb';
import { PublishedListingEditSheet } from '@/features/trips/components/PublishedListingEditSheet';
import { Button } from '@/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/shadcn/dropdown-menu';

interface PublishedListingActionsMenuProps {
  token: string;
  listing: PublishedTripListingRecord;
  activeGuest: PublishedTripGuestRecord | null;
}

export function PublishedListingActionsMenu({
  token,
  listing,
  activeGuest,
}: PublishedListingActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false);

  const canViewSource = typeof listing.url === 'string' && listing.url.length > 0;
  const canEdit = Boolean(activeGuest);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-8 border border-background/60 bg-background/90 p-0 shadow-sm backdrop-blur"
            size="icon"
            title="Open listing actions"
            variant="neutral"
            weight="ghost"
          >
            <span className="sr-only">Open listing actions</span>
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          {canViewSource ? (
            <DropdownMenuItem asChild>
              <Link href={listing.url as string} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4" />
                View source
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <Eye className="h-4 w-4" />
              View source
            </DropdownMenuItem>
          )}

          {canEdit ? (
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Edit className="h-4 w-4" />
              Edit details
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled title="Pick your guest name first">
              <Edit className="h-4 w-4" />
              Edit details
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canEdit ? (
        <PublishedListingEditSheet
          token={token}
          listing={listing}
          activeGuest={activeGuest}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </>
  );
}
