import { Prisma, Trip, User } from 'db';
import { ApiResponse } from '@/core/types';

export interface TripActionOptions {
  userId: string;
}

export type TripOperationOptions = {
  _?: never;
};

export interface TripGetOptions extends TripOperationOptions {
  userId?: string;
  include?: {
    collaborators?: boolean;
    listings?: boolean;
    invitations?: boolean;
    /** Alias for including the `user` relation. */
    owner?: boolean;
  };
}

export interface TripsGetOptions extends TripOperationOptions {
  userId: string;
  includeCollaborators?: boolean;
  includeListingsCount?: boolean;
}

export type TripWithCounts = Trip & {
  _count?: {
    listings?: number;
    collaborators?: number;
  };
  collaborators?: User[];
};

export type TripResponse = ApiResponse<Prisma.TripGetPayload<{ include?: TripGetOptions['include'] }>>;

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