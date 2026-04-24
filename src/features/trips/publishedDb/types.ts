import type { db, Prisma } from 'db';
import type {
  ownerCommentSelect,
  ownerShareListingSelect,
  publishedCommentInclude,
  publishedListingInclude,
  publishedTripShareSelect,
} from './prismaFragments';

/**
 * Runtime db-client union used by helpers that run either against
 * the shared client or inside a `$transaction` callback. Kept here so
 * every domain file can import the same alias.
 */
export type DbClient = typeof db | Prisma.TransactionClient;

/**
 * Raw Prisma shape returned by `publishedTripShareSelect`. The public
 * `PublishedTripShareRecord` (below) flattens the nested
 * `trip.guests` array up to a sibling of `trip` so consumers can
 * read `record.guests` directly.
 */
export type PublishedTripShareQueryRecord = Prisma.TripShareGetPayload<{
  select: typeof publishedTripShareSelect;
}>;

export type PublishedTripListingRecord = Prisma.ListingGetPayload<{
  include: typeof publishedListingInclude;
}>;

export type PublishedTripCommentRecord = Prisma.ListingCommentGetPayload<{
  include: typeof publishedCommentInclude;
}>;

export type PublishedTripGuestRecord = PublishedTripShareQueryRecord['trip']['guests'][number];

export type PublishedTripShareRecord = Omit<PublishedTripShareQueryRecord, 'trip'> & {
  trip: Omit<PublishedTripShareQueryRecord['trip'], 'guests'>;
  guests: PublishedTripGuestRecord[];
};

export type OwnerTripShareListingRecord = Prisma.ListingGetPayload<{
  select: typeof ownerShareListingSelect;
}>;

export type OwnerTripCommentRecord = Prisma.ListingCommentGetPayload<{
  select: typeof ownerCommentSelect;
}>;
