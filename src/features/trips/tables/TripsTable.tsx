'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, ArrowRight, Eye, Edit, Users } from 'lucide-react';
import type { Trip } from 'db';
import { GenericTable } from '@turbodima/ui/core/GenericTable';
import { Badge } from '@turbodima/ui/shadcn/badge';
import { ColumnDef } from '@turbodima/ui/core/GenericTable';
import { useAuth } from '@clerk/nextjs';
import { LinkButton } from '@turbodima/ui/core/LinkButton';

interface TripsTableProps {
  trips: Trip[];
  currentUserId?: string;
}

export function TripsTable({ trips, currentUserId }: TripsTableProps) {
  // If currentUserId wasn't passed, try to get it from the client-side auth
  const { userId } = useAuth() || {};
  const userIdToUse = currentUserId || userId;

  const columns: ColumnDef<Trip>[] = [
    {
      header: "Trip Name",
      accessorKey: "name",
      sortable: true,
      cell: (trip) => (
        <div className="font-medium">
          <Link href={`/trips/${trip.id}`} className="hover:underline">
            {trip.name}
          </Link>
          {userIdToUse && trip.userId !== userIdToUse && (
            <Badge weight="hollow" className="ml-2">
              <Users className="h-3 w-3 mr-1" />
              Shared
            </Badge>
          )}
        </div>
      )
    },
    {
      header: "Date Range",
      cell: (trip) => (
        <div className="flex items-center gap-1">
          {trip.startDate && (
            <>
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(trip.startDate, 'MMM d, yyyy')}</span>
            </>
          )}
          {trip.startDate && trip.endDate && (
            <>
              <ArrowRight className="h-4 w-4 text-muted-foreground mx-1" />
              <span>{format(trip.endDate, 'MMM d, yyyy')}</span>
            </>
          )}
          {!trip.startDate && !trip.endDate && (
            <span className="text-muted-foreground italic">No dates set</span>
          )}
        </div>
      )
    },
    {
      header: "Listings",
      cell: () => (
        <div className="flex items-center">
          <Badge variant="secondary">
            0 Listings
          </Badge>
        </div>
      )
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      sortable: true,
      cell: (trip) => format(trip.createdAt, 'MMM d, yyyy')
    },
    {
      header: "Actions",
      cell: (trip) => (
        <div className="flex items-center gap-2">
          <LinkButton href={`/trips/${trip.id}`} size="sm" weight="ghost">
            <Eye className="h-4 w-4 mr-1" /> View
          </LinkButton>
          {(!userIdToUse || trip.userId === userIdToUse) && (
            <LinkButton href={`/trips/${trip.id}/edit`} size="sm" weight="ghost">
              <Edit className="h-4 w-4 mr-1" /> Edit
            </LinkButton>
          )}
        </div>
      )
    }
  ];

  return (
    <GenericTable
      data={trips}
      columns={columns}
      basePath="/trips"
      rowKeyField="id"
      emptyStateProps={{
        title: "No trips found",
        description: "Create your first trip to get started.",
        icon: "Calendar"
      }}
    />
  );
}