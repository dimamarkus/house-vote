import { db } from 'db';
import { ErrorCode } from '@turbodima/core/errors';
import { handleDbOperation } from '@turbodima/core/responses';
import { processRelationOperations, getEntities } from '@turbodima/core/server-actions';
import { ListingFormData } from './schemas';
import {
  ListingActionOptions,
  ListingGetOptions,
  ListingCreateInputData,
  ListingResponse,
  GetListingsOptions,
  ListingsResponse,
  ListingStatus,
} from './types';
import { Prisma } from 'db';
// Define the type for Prisma models available on the client
  type DbClientWithModels = typeof db | Prisma.TransactionClient;

/**
 * Database operations for listings feature
 * Provides CRUD operations and search functionality for listing management
 */
export const listings = {
  // --------------------------------------------------------------------------------
  // Create
  // --------------------------------------------------------------------------------

  /**
   * Create a new listing
   *
   * @param data - The listing data to create (including addedById)
   * @param options - Optional settings including transaction client and includes
   * @returns Created listing data
   */
  create: async (
    data: ListingCreateInputData,
    options?: ListingActionOptions
  ): Promise<ListingResponse> => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      // Create the listing
      return (dbClient as DbClientWithModels).listing.create({
        data,
        include: options?.include
      });
    }, 'Failed to create listing:', ErrorCode.DATABASE_ERROR);
  },

  /**
   * Create a new listing from imported data (used by import action)
   *
   * @param data - The listing data from the import, including relations like tripId and addedById
   * @param options - Optional settings including transaction client and includes
   * @returns Created listing data
   */
  createFromImport: async (
    // Use Prisma.ListingCreateInput as it correctly represents the data structure needed
    data: Prisma.ListingCreateInput,
    options?: ListingActionOptions
  ): Promise<ListingResponse> => {
    const dbClient = options?.tx || db;

    // Use handleDbOperation for consistent error handling
    return handleDbOperation(async () => {
      return (dbClient as DbClientWithModels).listing.create({
        data,
        include: options?.include,
      });
    }, 'Failed to create listing from import:', ErrorCode.DATABASE_ERROR);
  },

  // --------------------------------------------------------------------------------
  // Read
  // --------------------------------------------------------------------------------

  /**
   * Get a single listing by ID
   *
   * @param listingId - The ID of the listing to fetch
   * @param options - Optional settings including transaction client, select, and include
   * @throws Error if the listing is not found
   * @returns Listing data
   */
  get: async (
    listingId: string,
    options?: ListingGetOptions
  ): Promise<ListingResponse> => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      // Construct args conditionally based on options
      const findArgs: Prisma.ListingFindUniqueArgs = {
        where: { id: listingId },
      };
      if (options?.select) {
        findArgs.select = options.select;
      } else if (options?.include) {
        findArgs.include = options.include;
      }

      const listing = await (dbClient as DbClientWithModels).listing.findUnique(findArgs);

      if (!listing) {
        throw new Error('Listing not found');
      }

      return listing;
    }, 'Failed to fetch listing:', ErrorCode.NOT_FOUND);
  },

  /**
   * Get multiple listings with flexible options
   * Supports pagination, searching, and sorting
   *
   * @param options - Search options including pagination, filters, and sorting
   * @returns List of listings matching the criteria
   */
  getMany: async (
    options?: GetListingsOptions
  ): Promise<ListingsResponse> => {
    const dbClient = options?.tx || db;

    // Use the getEntities utility for standardized fetching
    return getEntities((dbClient as DbClientWithModels).listing, {
      ...options,
      searchFields: ['id', 'address', 'url', 'notes', 'addedById', 'tripId'], // Default to string fields or fallback
      // Ensure sortBy conforms to the expected Prisma type
      sortBy: (options?.sortBy || 'createdAt') as Prisma.ListingScalarFieldEnum | undefined,
      sortOrder: options?.sortOrder || 'desc'
    });
  },

  // --------------------------------------------------------------------------------
  // Read - Specific Filters
  // --------------------------------------------------------------------------------

  /**
   * Get multiple listings filtered by Trip ID
   * Supports pagination, searching, and sorting within the trip's listings
   *
   * @param tripId - The ID of the trip to fetch listings for
   * @param options - Search options including pagination, filters, and sorting
   * @returns List of listings for the specified trip
   */
  getManyByTripId: async (
    tripId: string,
    options?: GetListingsOptions
  ): Promise<ListingsResponse> => {
    const dbClient = options?.tx || db;

    // Use the getEntities utility with an additional where clause for tripId
    return getEntities((dbClient as DbClientWithModels).listing, {
      ...options,
      where: {
        ...options?.where, // Preserve existing filters if any
        tripId: tripId,
      },
      searchFields: ['id', 'address', 'url', 'notes', 'addedById'], // Default to string fields or fallback
      sortBy: (options?.sortBy || 'createdAt') as Prisma.ListingScalarFieldEnum | undefined,
      sortOrder: options?.sortOrder || 'desc'
    });
  },

  // --------------------------------------------------------------------------------
  // Update
  // --------------------------------------------------------------------------------

  /**
   * Update an existing listing
   *
   * @param listingId - The ID of the listing to update
   * @param data - The fields to update (partial update supported)
   * @param options - Optional settings including transaction client, includes, and relations
   * @throws Error if listing not found
   * @returns Updated listing data
   */
  update: async (
    listingId: string,
    data: Partial<ListingFormData>,
    options?: ListingActionOptions
  ): Promise<ListingResponse> => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      // Check if listing exists
      const existingListing = await (dbClient as DbClientWithModels).listing.findUnique({
        where: { id: listingId },
        select: { id: true } // Select only id for existence check
      });

      if (!existingListing) {
        throw new Error('Listing not found');
      }

      // Process any relation operations
      const relationUpdates = processRelationOperations(options?.relations);

      // Update the listing with both data and relation updates
      return (dbClient as DbClientWithModels).listing.update({
        where: { id: listingId },
        data: {
          ...data,
          ...relationUpdates
        },
        include: options?.include
      });
    }, 'Failed to update listing:', ErrorCode.NOT_FOUND);
  },

  // --------------------------------------------------------------------------------
  // Delete
  // --------------------------------------------------------------------------------

  /**
   * Delete a listing
   *
   * @param listingId - The ID of the listing to delete
   * @param options - Optional settings including transaction client and includes
   * @throws Error if listing not found
   * @returns Deleted listing data
   */
  delete: async (
    listingId: string,
    options?: ListingActionOptions
  ): Promise<ListingResponse> => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      // Check if listing exists
      const existingListing = await (dbClient as DbClientWithModels).listing.findUnique({
        where: { id: listingId }
      });

      if (!existingListing) {
        throw new Error('Listing not found');
      }

      // Delete the listing
      return (dbClient as DbClientWithModels).listing.delete({
        where: { id: listingId },
        include: options?.include
      });
    }, 'Failed to delete listing:', ErrorCode.NOT_FOUND);
  },

  // Update a listing's status
  updateStatus: async (
    listingId: string,
    status: ListingStatus,
    options?: ListingActionOptions & { performedBy?: string }
  ) => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      // Check if listing exists
      const listing = await (dbClient as DbClientWithModels).listing.findUnique({
        where: { id: listingId }
      });

      if (!listing) {
        throw new Error("Listing not found");
      }

      // Update the listing status
      return (dbClient as DbClientWithModels).listing.update({
        where: { id: listingId },
        data: {
          status,
          // Record who updated the status if provided
          ...(options?.performedBy && {
            statusUpdatedById: options.performedBy,
            statusUpdatedAt: new Date()
          })
        },
        include: options?.include
      });
    }, "Failed to update listing status:", ErrorCode.PROCESSING_ERROR);
  },

  // Get a trip with collaborators for a listing
  getTripWithCollaborators: async (listingId: string, options?: ListingActionOptions) => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      // First get the listing to find the tripId
      const listing = await (dbClient as DbClientWithModels).listing.findUnique({
        where: { id: listingId },
        select: { tripId: true }
      });

      if (!listing) {
        throw new Error("Listing not found");
      }

      // Get the trip with collaborators
      const trip = await (dbClient as DbClientWithModels).trip.findUnique({
        where: { id: listing.tripId },
        include: {
          collaborators: true
        }
      });

      if (!trip) {
        throw new Error("Trip not found");
      }

      return trip;
    }, "Failed to get trip for listing:", ErrorCode.PROCESSING_ERROR);
  },
};