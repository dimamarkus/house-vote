"use server";

import { auth } from "@clerk/nextjs/server";
import { ErrorCode } from "@turbodima/core/errors";
import { createErrorResponse, createSuccessResponse } from "@turbodima/core/responses";
import { revalidatePath } from "next/cache";
import { listings } from "../db";
import type { Listing } from "db";
import { ListingStatus } from "db";
import { z } from "zod";
import { validateActionInput } from "@turbodima/core/form-data";
import { ApiResponse } from "@turbodima/core/types";
import { trips } from "../../trips/db";

// Input schema for updating listing status
const updateListingStatusSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  status: z.nativeEnum(ListingStatus, {
    errorMap: () => ({ message: "Invalid listing status" }),
  }),
});

// Define response type using standard ApiResponse
type UpdateListingStatusResponse = ApiResponse<Listing>;

export async function updateListingStatus(formData: FormData): Promise<UpdateListingStatusResponse> {
  try {
    // Get current user
    const { userId } = await auth();

    // Check if authenticated
    if (!userId) {
      return createErrorResponse({
        error: "You must be logged in to update listing status",
        code: ErrorCode.UNAUTHORIZED,
      });
    }

    // Validate input using standard validator
    const validationResult = validateActionInput(formData, updateListingStatusSchema);
    if (!validationResult.success) {
      return validationResult; // Return error response directly
    }

    const { listingId, status } = validationResult.data;

    // Get the listing to ensure it exists and get tripId
    const listingResult = await listings.get(listingId, { select: { id: true, tripId: true, addedById: true } });
    if (!listingResult.success) {
       return createErrorResponse({ error: "Listing not found", code: ErrorCode.NOT_FOUND });
    }
    const listing = listingResult.data;
    const tripId = listing.tripId;

    // --- Authorization Check ---
    // Fetch the Trip using trips.get - it includes auth check for the current user
    const tripResult = await trips.get(tripId, { userId: userId }); // Pass current userId

    if (!tripResult.success) {
      // If trips.get fails (e.g., user doesn't have access), return the error
       return createErrorResponse({
         error: tripResult.error || "Permission denied or trip not found.",
         code: tripResult.code || ErrorCode.FORBIDDEN,
       });
    }
    // If trips.get succeeds, the user is either the owner or a collaborator
    // --- End Authorization Check ---

    // Update the listing status
    const updateResult = await listings.updateStatus(listingId, status, {
      // performedBy is likely not needed if auth is checked above
    });

    if (!updateResult.success) {
      return updateResult; // Return DB error directly
    }

    // Revalidate paths using tripId from the fetched listing
    revalidatePath(`/trips/${tripId}`); // Use tripId variable
    revalidatePath(`/trips`);

    // Use createSuccessResponse
    return createSuccessResponse({
      data: updateResult.data,
    });

  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: "Failed to update listing status:",
    });
  }
}