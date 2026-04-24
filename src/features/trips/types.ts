import { ListingCommentKind, Prisma, Trip, TripGuestSource, User } from 'db';
import { ApiResponse } from '@/core/types';

/**
 * Toggleable settings on a trip's public share page. Same shape that comes
 * back from `publishedTripShareSelect`, but with only the UI-facing fields
 * — no timestamps, no nested trip payload. Used by the dashboard cards,
 * the sidebar, and published-action response types.
 */
export interface TripShareSettings {
  token: string;
  isPublished: boolean;
  votingOpen: boolean;
  commentsOpen: boolean;
  allowGuestSuggestions: boolean;
}

/** Published-share action response: settings plus the trip id. */
export interface TripShareState extends TripShareSettings {
  tripId: string;
}

export interface OwnerTripShareSummaryListing {
  id: string;
  title: string;
  status: string;
}

export interface OwnerTripShareSummaryComment {
  id: string;
  kind: ListingCommentKind;
  body: string;
  createdAt: Date;
  hiddenAt: Date | null;
  guest: {
    id: string;
    guestDisplayName: string;
  };
  listing: {
    id: string;
    title: string;
  };
}

export interface OwnerTripShareSummaryGuest {
  id: string;
  guestDisplayName: string;
  source: TripGuestSource;
  votes: Array<{
    listingId: string;
  }>;
}

/**
 * Owner-facing dashboard view of a trip's public share state. Flattened
 * projection of `publishedTrips.getOwnerTripShareSummary()` so server and
 * client components agree on one shape without importing full Prisma records.
 */
export interface OwnerTripShareSummary {
  share: TripShareSettings | null;
  listings: OwnerTripShareSummaryListing[];
  comments: OwnerTripShareSummaryComment[];
  guests: OwnerTripShareSummaryGuest[];
}

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