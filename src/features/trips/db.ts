import { db } from 'db';
import { Prisma, Trip, User, InviteStatus } from 'db';
import { ErrorCode } from '@turbodima/core/errors';
import type { TripFormData } from './schemas';
import { TripOperationOptions, TripGetOptions } from './types';
import { randomUUID } from 'node:crypto';
import { handleDbOperation } from '@turbodima/core/responses';
import { hashTripImportToken } from './utils/hashTripImportToken';

type TripWithCollaborators = Prisma.TripGetPayload<{
  include: { collaborators: true };
}>;

// Type guard to check if collaborators are included
function hasCollaborators(trip: Trip | TripWithCollaborators): trip is TripWithCollaborators {
  return 'collaborators' in trip && Array.isArray(trip.collaborators);
}

// Database operations for trips
export const trips = {
  // Create a new trip
  create: async (data: TripFormData & { userId: string }, options?: TripOperationOptions & { includes?: { listings?: boolean; collaborators?: boolean; } }) => {
    const dbClient = db;
    return handleDbOperation(async () => {
      const include = options?.includes;
      return dbClient.trip.create({
        data,
        include: include ? {
          listings: include.listings,
          collaborators: include.collaborators
        } : undefined
      });
    }, 'Failed to create trip:', ErrorCode.DATABASE_ERROR);
  },

  // Get a trip by ID
  get: async (tripId: string, options?: TripGetOptions & { tx?: Prisma.TransactionClient }) => {
    const dbClient = db;
    const userId: string | undefined = options?.userId;
    const include: TripGetOptions['include'] | undefined = options?.include;

    return handleDbOperation(async () => {
      // Determine include options, always including collaborators for auth if not explicitly defined
      const includeOptions: Prisma.TripInclude = {
        collaborators: include?.collaborators ?? true, // Default to true for auth check
        listings: include?.listings,
        invitations: include?.invitations,
        user: include?.owner, // Map owner to user relation
      };

      const trip = await dbClient.trip.findUnique({
        where: { id: tripId },
        include: includeOptions,
      });

      if (!trip) {
        throw new Error('Trip not found');
      }

      // Authorization check: Ensure the requesting user is either the owner or a collaborator
      if (userId && trip.userId !== userId) {
        // collaborators relation is always included by includeOptions logic above
        if (!hasCollaborators(trip) || !trip.collaborators.some((c: User) => c.id === userId)) {
          throw new Error('User does not have access to this trip');
        }
      }

      // Conditionally remove collaborators if they weren't explicitly requested
      if (!include?.collaborators && hasCollaborators(trip)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { collaborators, ...rest } = trip;
        return rest as Omit<typeof trip, 'collaborators'> & { collaborators?: User[] }; // More specific return type
      }

      return trip;
    }, 'Failed to get trip:', ErrorCode.NOT_FOUND);
  },

  // Get all trips for a user
  getByUser: async (userId: string, options?: TripOperationOptions & {
    page?: number;
    limit?: number;
    sortBy?: keyof Trip;
    sortOrder?: 'asc' | 'desc';
    includes?: { listings?: boolean; collaborators?: boolean; };
  }) => {
    const dbClient = db;
    return handleDbOperation(async () => {
      const {
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options || {};

      const skip = (page - 1) * limit;

      const include = options?.includes;

      // Also find trips where the user is a collaborator
      return dbClient.trip.findMany({
        where: {
          OR: [
            { userId }, // User is owner
            { collaborators: { some: { id: userId } } } // User is collaborator
          ]
        },
        include: include ? {
          listings: include.listings,
          collaborators: include.collaborators
        } : undefined,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      });
    }, 'Failed to retrieve trips:', ErrorCode.DATABASE_ERROR);
  },

  // Update a trip
  update: async (id: string, userId: string, data: Partial<TripFormData>, options?: TripOperationOptions & {
    includes?: { listings?: boolean; collaborators?: boolean; };
  }) => {
    const dbClient = db;
    return handleDbOperation(async () => {
      // First check if trip exists and belongs to user
      const existingTrip = await dbClient.trip.findUnique({
        where: { id },
        include: { collaborators: true }
      });

      if (!existingTrip) {
        throw new Error('Trip not found');
      }

      // Allow both owners and collaborators to update
      const isOwner = existingTrip.userId === userId;
      const isCollaborator = existingTrip.collaborators.some(collaborator => collaborator.id === userId);

      if (!isOwner && !isCollaborator) {
        throw new Error('You do not have permission to update this trip');
      }

      const include = options?.includes;

      // Perform update
      return dbClient.trip.update({
        where: { id },
        data,
        include: include ? {
          listings: include.listings,
          collaborators: include.collaborators
        } : undefined
      });
    }, 'Failed to update trip:', ErrorCode.DATABASE_ERROR);
  },

  // Delete a trip
  delete: async (id: string, userId: string, _options?: TripOperationOptions) => {
    void _options;
    const dbClient = db;
    return handleDbOperation(async () => {
      // First check if trip exists and belongs to user
      const existingTrip = await dbClient.trip.findUnique({
        where: { id }
      });

      if (!existingTrip) {
        throw new Error('Trip not found');
      }

      // Only owner can delete a trip
      if (existingTrip.userId !== userId) {
        throw new Error('You do not have permission to delete this trip');
      }

      // Delete any related listings first (cascade doesn't work automatically)
      await dbClient.listing.deleteMany({
        where: { tripId: id }
      });

      // Delete the trip
      return dbClient.trip.delete({
        where: { id }
      });
    }, 'Failed to delete trip:', ErrorCode.DATABASE_ERROR);
  },

  /**
   * Create an invitation for a trip
   */
  createInvitation: async (
    data: { email: string; tripId: string },
    options?: TripOperationOptions & { includes?: { trip?: boolean } }
  ) => {
    return handleDbOperation(async () => {
      // Generate a unique token
      const token = randomUUID();

      // Set expiration date (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const include = options?.includes;

      // Create the invitation
      return await db.tripInvitation.create({
        data: {
          email: data.email,
          token,
          expiresAt,
          trip: {
            connect: { id: data.tripId }
          }
        },
        include: {
          trip: include?.trip ? true : undefined
        }
      });
    }, 'Failed to create invitation');
  },

  /**
   * Get an invitation by token
   */
  getInvitationByToken: async (token: string, options?: TripOperationOptions & { includes?: { trip?: boolean } }) => {
    return handleDbOperation(async () => {
      const include = options?.includes;
      const invitation = await db.tripInvitation.findUnique({
        where: { token },
        include: {
          trip: include?.trip ? true : undefined
        }
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      return invitation;
    }, 'Failed to get invitation');
  },

  /**
   * Update invitation status
   */
  updateInvitationStatus: async (
    token: string,
    status: InviteStatus,
    options?: TripOperationOptions & { includes?: { trip?: boolean } }
  ) => {
    return handleDbOperation(async () => {
      const include = options?.includes;
      return await db.tripInvitation.update({
        where: { token },
        data: { status },
        include: {
          trip: include?.trip ? true : undefined
        }
      });
    }, 'Failed to update invitation');
  },

  /**
   * Add user as a collaborator to a trip
   */
  addCollaborator: async (tripId: string, userId: string, options?: TripOperationOptions & {
    includes?: { listings?: boolean; collaborators?: boolean; };
  }) => {
    return handleDbOperation(async () => {
      const include = options?.includes;
      return await db.trip.update({
        where: { id: tripId },
        data: {
          collaborators: {
            connect: { id: userId }
          }
        },
        include: include ? {
          listings: include.listings,
          collaborators: include.collaborators
        } : undefined
      });
    }, 'Failed to add collaborator');
  },

  /**
   * Get invitations for a trip
   */
  getInvitationsByTripId: async (tripId: string, options?: TripOperationOptions & { includes?: { trip?: boolean } }) => {
    return handleDbOperation(async () => {
      const include = options?.includes;
      return await db.tripInvitation.findMany({
        where: { tripId },
        include: {
          trip: include?.trip ? true : undefined
        }
      });
    }, 'Failed to get invitations');
  },

  // Find or create a shareable invite link
  findOrCreateShareableInvite: async (tripId: string, ownerId: string, _options?: { tx?: Prisma.TransactionClient }) => {
    void _options;
    const dbClient = db;
    return handleDbOperation(async () => {
      // First, verify the user is the owner of the trip
      const trip = await dbClient.trip.findUnique({
        where: { id: tripId },
        select: { userId: true }
      });

      if (!trip) {
        throw new Error('Trip not found.');
      }
      if (trip.userId !== ownerId) {
        throw new Error('Only the trip owner can generate shareable links.');
      }

      // Try to find an existing, valid shareable invite (email is empty string instead of null)
      const existingInvite = await dbClient.tripInvitation.findFirst({
        where: {
          tripId: tripId,
          email: '', // Use empty string instead of null
          status: InviteStatus.PENDING,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (existingInvite) {
        return existingInvite;
      }

      // If no valid invite exists, create a new one
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const newInvite = await dbClient.tripInvitation.create({
        data: {
          tripId: tripId,
          email: '', // Use empty string instead of null
          token: token,
          status: InviteStatus.PENDING,
          expiresAt: expiresAt,
        }
      });

      return newInvite;

    }, 'Failed to find or create shareable invite link:', ErrorCode.DATABASE_ERROR);
  },

  rotateImportToken: async (tripId: string, ownerId: string) => {
    return handleDbOperation(async () => {
      const trip = await db.trip.findUnique({
        where: { id: tripId },
        select: { userId: true },
      });

      if (!trip) {
        throw new Error('Trip not found.');
      }

      if (trip.userId !== ownerId) {
        throw new Error('Only the trip owner can rotate import tokens.');
      }

      const plainToken = randomUUID();
      const tokenHash = hashTripImportToken(plainToken);

      await db.tripImportToken.upsert({
        where: { tripId },
        update: {
          tokenHash,
          lastUsedAt: null,
        },
        create: {
          tripId,
          tokenHash,
        },
      });

      return {
        token: plainToken,
      };
    }, 'Failed to rotate trip import token:', ErrorCode.DATABASE_ERROR);
  },

  validateImportToken: async (tripId: string, token: string) => {
    const tokenHash = hashTripImportToken(token);

    return handleDbOperation(async () => {
      const importToken = await db.tripImportToken.findUnique({
        where: {
          tripId,
        },
      });

      if (!importToken || importToken.tokenHash !== tokenHash) {
        throw new Error('Invalid import token.');
      }

      await db.tripImportToken.update({
        where: {
          tripId,
        },
        data: {
          lastUsedAt: new Date(),
        },
      });

      return {
        tripId,
      };
    }, 'Failed to validate trip import token:', ErrorCode.FORBIDDEN);
  },
};