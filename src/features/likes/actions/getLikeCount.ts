"use server";

import { ErrorCode } from "@/core/errors";
import { createErrorResponse, createSuccessResponse } from "@/core/responses";
import { likes } from "../db";
import { LikeCountResponse } from "../types";

export async function getLikeCount(
  listingId: string
): Promise<LikeCountResponse> {
  try {
    // Get like count for the listing
    const result = await likes.getCount(listingId);

    if (!result.success) {
      // Return DB error directly
      return result;
    }

    // Use createSuccessResponse
    return createSuccessResponse({ data: result.data.count });

  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: "Failed to get like count:",
    });
  }
}