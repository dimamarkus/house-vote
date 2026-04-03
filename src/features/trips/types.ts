import { Prisma, Trip, User } from 'db';
import { ApiResponse } from '@turbodima/core/types';

// Trip-specific options for database operations
export interface TripActionOptions {
  userId: string;
  // Add any other options needed for actions
}

export type TripOperationOptions = {
  _?: never;
};

// Define options for fetching trips
export interface TripGetOptions extends TripOperationOptions {
  userId?: string; // Optional userId for authorization checks
  include?: {
    collaborators?: boolean;
    listings?: boolean;
    invitations?: boolean;
    owner?: boolean; // Alias for including the 'user' relation
  };
}

// Define options for fetching multiple trips (list view)
export interface TripsGetOptions extends TripOperationOptions {
  userId: string; // Required for filtering user's trips
  includeCollaborators?: boolean;
  includeListingsCount?: boolean;
  // Add pagination, sorting, filtering options later
}

// Response type for getTrips operation
export type TripWithCounts = Trip & {
  _count?: {
    listings?: number;
    collaborators?: number;
  };
  // Include collaborator info if requested
  collaborators?: User[];
};

// Response type for trip operations
export type TripResponse = ApiResponse<Prisma.TripGetPayload<{ include?: TripGetOptions['include'] }>>;

// Response type for multiple trip operations
export type TripsResponse = ApiResponse<Prisma.TripGetPayload<{ include?: TripGetOptions['include'] }>[]>;

export type TripCreateInputData = {
  name: string;
  startDate?: Date;
  endDate?: Date;
};

export type InvitationCreateInputData = {
  email: string;
  tripId: string;
};

export enum InviteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED'
}

export type InvitationUpdateData = {
  status: InviteStatus;
};