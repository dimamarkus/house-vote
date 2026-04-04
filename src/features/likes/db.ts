import { db } from "db";
import { ErrorCode } from "@/core/errors";
import { handleDbOperation } from "@/core/responses";
import { type PrismaClient, Prisma } from "db";
import { LikeActionOptions, LikeCreateInputData } from "./types";
import { PrismaActionOptions, ApiResponse } from '@/core/types';

// Type for database client (can be regular Prisma client or transaction client)
  type DbClient = PrismaClient | Prisma.TransactionClient;

// Database operations for likes
export const likes = {
  // Create a like
  create: async (data: LikeCreateInputData, options?: LikeActionOptions) => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      // Check if like already exists for this user and listing
      const existingLike = await (dbClient as DbClient).like.findFirst({
        where: {
          userId: data.userId,
          listingId: data.listingId,
        },
      });

      if (existingLike) {
        return existingLike; // Return existing like if already liked
      }

      // Create new like
      return (dbClient as DbClient).like.create({
        data,
        include: options?.include
      });
    }, "Failed to create like:", ErrorCode.ALREADY_EXISTS);
  },

  // Delete a like
  delete: async (userId: string, listingId: string, options?: LikeActionOptions) => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      // Find the like
      const like = await (dbClient as DbClient).like.findFirst({
        where: {
          userId,
          listingId,
        },
      });

      if (!like) {
        throw new Error("Like not found");
      }

      // Delete the like
      return (dbClient as DbClient).like.delete({
        where: {
          id: like.id,
        },
      });
    }, "Failed to delete like:", ErrorCode.NOT_FOUND);
  },

  // Check if a user has liked a listing
  hasLiked: async (userId: string, listingId: string, options?: LikeActionOptions) => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      const like = await (dbClient as DbClient).like.findFirst({
        where: {
          userId,
          listingId,
        },
      });

      return { hasLiked: !!like };
    }, "Failed to check like status:", ErrorCode.PROCESSING_ERROR);
  },

  // Get like count for a listing
  getCount: async (listingId: string, options?: LikeActionOptions) => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      const count = await (dbClient as DbClient).like.count({
        where: {
          listingId,
        },
      });
      return { count };
    }, "Failed to get like count:", ErrorCode.PROCESSING_ERROR);
  },

  // Get all likes for a listing with user information
  getByListing: async (listingId: string, options?: LikeActionOptions) => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      return (dbClient as DbClient).like.findMany({
        where: {
          listingId,
        },
        include: {
          user: true,
          ...options?.include
        },
      });
    }, "Failed to get likes:", ErrorCode.PROCESSING_ERROR);
  },

  // Toggle a like (create if doesn't exist, delete if exists)
  toggle: async (data: LikeCreateInputData, options?: LikeActionOptions) => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      const { userId, listingId } = data;

      // Check if the like already exists
      const existingLike = await (dbClient as DbClient).like.findFirst({
        where: {
          userId,
          listingId,
        },
      });

      // If like exists, delete it
      if (existingLike) {
        await (dbClient as DbClient).like.delete({
          where: {
            id: existingLike.id,
          },
        });
        return { created: false, deleted: true, like: null };
      }

      // If like doesn't exist, create it
      const newLike = await (dbClient as DbClient).like.create({
        data,
        include: options?.include
      });

      return { created: true, deleted: false, like: newLike };
    }, "Failed to toggle like:", ErrorCode.PROCESSING_ERROR);
  },

  /**
   * Get distinct guest display names from likes associated with a trip's listings.
   */
  getGuestNamesByTrip: async (
    tripId: string,
    options?: PrismaActionOptions
  ): Promise<ApiResponse<string[]>> => {
    const dbClient = options?.tx || db;

    return handleDbOperation(async () => {
      const distinctLikes = await (dbClient as DbClient).like.findMany({
        where: {
          listing: {
            tripId: tripId,
          },
          guestDisplayName: {
            not: null, // Only consider likes made by guests
          },
        },
        select: {
          guestDisplayName: true,
        },
        distinct: ['guestDisplayName'],
      });

      // Extract non-null names
      const guestNames = (distinctLikes as Array<{ guestDisplayName: string | null }>)
        .map((likeItem) => likeItem.guestDisplayName)
        .filter((name): name is string => name !== null);

      return guestNames;
    }, 'Failed to fetch guest names:', ErrorCode.DATABASE_ERROR);
  },
};