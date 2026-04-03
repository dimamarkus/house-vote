import { Prisma } from "db";
import { ApiResponse, PrismaActionOptions } from "@turbodima/core/types";

// Options for like database operations
export type LikeActionOptions = PrismaActionOptions<Prisma.LikeInclude>;

// Input data for creating a like
export interface LikeCreateInputData {
  userId: string;
  listingId: string;
}

// Response types
export type LikeResponse = ApiResponse<Prisma.LikeGetPayload<object>>;
export type LikeToggleResponse = ApiResponse<{
  created: boolean;
  deleted: boolean;
  like: Prisma.LikeGetPayload<object> | null;
}>;
export type LikesResponse = ApiResponse<Prisma.LikeGetPayload<object>[]>;
export type LikeCountResponse = ApiResponse<number>;
export type HasLikedResponse = ApiResponse<boolean>;