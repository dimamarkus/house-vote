import { Listing, Prisma, ListingStatus as PrismaListingStatus } from "db";
import { GetEntityOptions } from "@/core/server-actions";
import {
  ArrayApiResponse,
  BasicApiResponse,
  ModelAggregations,
  PrismaActionOptionsWithRelations
} from '@/core/types';
import { GenericSearchParams } from '@/core/schemas';
import { ListingFormData } from "./schemas"; // Import form data type

/**
 * Relations that can be connected/disconnected for listings
 */
export type ListingRelations = Record<string, never>;

/**
 * Count fields for Listing relations
 * Used for aggregation queries
 */
export type ListingCountFields = Record<string, never>;

/**
 * Listing with usage statistics
 * Extends the base model with counts of related items
 */
export type ListingWithRelations = Prisma.ListingGetPayload<object> & ModelAggregations<ListingCountFields>;
export type ListingWithMedia = Prisma.ListingGetPayload<{
  include: {
    photos: true;
    likes: true;
  };
}>;

/**
 * Valid sort fields for listings, including virtual fields
 */
export type ListingSortField = keyof Listing | 'relatedItemsCount';

/**
 * Define the ListingStatus enum locally for clearer usage in the feature
 */
export const ListingStatus = PrismaListingStatus;
export type ListingStatus = PrismaListingStatus;

// --------------------------------------------------------------------------------------------
// REQUEST OPTIONS
// --------------------------------------------------------------------------------------------

/**
 * Core options that can be passed to any listing action
 * Includes transaction client, include options, and relation updates
 */
export type ListingActionOptions = PrismaActionOptionsWithRelations<
  Prisma.ListingInclude,
  ListingRelations
>;

/**
 * Specific options for the `get` listing action, allowing `select`.
 */
export type ListingGetOptions = Omit<ListingActionOptions, 'include' | 'relations'> & {
  select?: Prisma.ListingSelect;
  include?: Prisma.ListingInclude; // Keep include for flexibility, db layer will prioritize select
  tx?: Prisma.TransactionClient;
};

/**
 * Options for fetching multiple listings
 * Extends the generic search params with Listing-specific options
 */
export type GetListingsOptions = Omit<GetEntityOptions<Listing, Prisma.ListingInclude>, 'sortBy'> &
  GenericSearchParams & {
    /** Field to sort by (can include virtual fields) */
    sortBy?: ListingSortField;
    /** Custom ordering options for advanced queries */
    _customOrderBy?: Prisma.ListingOrderByWithRelationInput;
    /** Transaction client for database operations */
    tx?: Prisma.TransactionClient;
  };

// --------------------------------------------------------------------------------------------
// RESPONSES
// --------------------------------------------------------------------------------------------

/**
 * Response type for a single listing
 */
export type ListingResponse = BasicApiResponse<Prisma.ListingGetPayload<object>>;

/**
 * Response type for multiple listings
 */
export type ListingsResponse = ArrayApiResponse<Prisma.ListingGetPayload<object>>

/**
 * Listing with extended data
 * Use this interface to add additional fields not defined in the Prisma model
 */
export type ListingWithDetails = Prisma.ListingGetPayload<object>;

/**
 * Data required to create a new Listing in the database.
 * Combines form data with server-side data like addedById.
 */
export type ListingCreateInputData = ListingFormData & {
  addedById: string;
};