'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from 'db';
import type { Prisma } from 'db';
import { auth } from '@clerk/nextjs/server';
import { ErrorCode } from '@/core/errors';
import { validateActionInput } from '@/core/form-data';
import { createErrorResponse, createSuccessResponse } from '@/core/responses';
import { trips } from '@/features/trips/db';
import type { RoomBreakdown } from '../import/types';
import {
  getMissingImportedListingFields,
  recalculateImportStatus,
} from '../import/normalizeImportedListing';
import { normalizeMultilineText } from '../import/importHelpers';
import { scrapeListingMetadataFromUrl } from '../import/scrapeListingMetadataFromUrl';
import { applyNormalizedImportToListingId } from '../import/upsertImportedListing';

const RefreshListingInputSchema = z.object({
  listingId: z.string().cuid({ message: 'A valid listing id is required.' }),
});

const REFRESH_LISTING_SELECT = {
  id: true,
  tripId: true,
  url: true,
  addedById: true,
  title: true,
  address: true,
  price: true,
  bedroomCount: true,
  bedCount: true,
  bathroomCount: true,
  sourceDescription: true,
  roomBreakdown: true,
} satisfies Prisma.ListingSelect;

function stripTrailingEllipsis(value: string): string {
  return value.replace(/(?:\.\.\.|…)\s*$/, '').trim();
}

function resolveRefreshedSourceDescription(
  existingDescription: string | null | undefined,
  refreshedDescription: string | null,
): string | null {
  const existingText = normalizeMultilineText(existingDescription);
  const refreshedText = normalizeMultilineText(refreshedDescription);

  if (!refreshedText) {
    return existingText;
  }

  if (!existingText) {
    return refreshedText;
  }

  const refreshedCore = stripTrailingEllipsis(refreshedText);
  const looksLikeDowngrade =
    refreshedText.length < existingText.length &&
    refreshedCore.length > 0 &&
    existingText.includes(refreshedCore);

  return looksLikeDowngrade ? existingText : refreshedText;
}

function parseStoredRoomBreakdown(value: unknown): RoomBreakdown | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const summary =
    typeof (value as { summary?: unknown }).summary === 'string'
      ? (value as { summary: string }).summary
      : null;
  const roomsValue = (value as { rooms?: unknown }).rooms;

  if (!Array.isArray(roomsValue) || roomsValue.length === 0) {
    return null;
  }

  const rooms = roomsValue
    .map((room) => {
      if (!room || typeof room !== 'object' || Array.isArray(room)) {
        return null;
      }

      const name = typeof (room as { name?: unknown }).name === 'string' ? (room as { name: string }).name.trim() : '';
      const beds = typeof (room as { beds?: unknown }).beds === 'string' ? (room as { beds: string }).beds.trim() : '';
      const imageUrl =
        typeof (room as { imageUrl?: unknown }).imageUrl === 'string'
          ? (room as { imageUrl: string }).imageUrl.trim() || null
          : null;

      if (!name || !beds) {
        return null;
      }

      return { name, beds, imageUrl };
    })
    .filter((room): room is NonNullable<typeof room> => Boolean(room));

  return rooms.length > 0 ? { summary, rooms } : null;
}

function resolveRefreshedRoomBreakdown(
  existingRoomBreakdown: unknown,
  refreshedRoomBreakdown: RoomBreakdown | null,
): RoomBreakdown | null {
  return refreshedRoomBreakdown ?? parseStoredRoomBreakdown(existingRoomBreakdown);
}

/** Keep the existing value when a refresh scrape comes back empty. */
function keepExisting<T>(refreshed: T | null | undefined, existing: T | null | undefined): T | null {
  return (refreshed ?? existing ?? null) as T | null;
}

function refreshedPhotoUrlsForImportStatus(
  normalized: { photoUrls: string[]; imageUrl: string | null },
): string[] {
  if (normalized.photoUrls.length > 0) {
    return normalized.photoUrls;
  }
  if (normalized.imageUrl) {
    return [normalized.imageUrl];
  }
  return [];
}

export async function refreshListingFromSourceUrl(input: unknown) {
  const authData = await auth();
  const userId = authData?.userId;
  if (!userId) {
    return createErrorResponse({
      error: 'User not authenticated',
      code: ErrorCode.UNAUTHENTICATED,
    });
  }

  const validationResult = validateActionInput(
    input as FormData | Record<string, unknown>,
    RefreshListingInputSchema,
  );
  if (!validationResult.success) {
    return validationResult;
  }

  const { listingId } = validationResult.data;

  try {
    const listing = await db.listing.findUnique({
      where: { id: listingId },
      select: REFRESH_LISTING_SELECT,
    });

    if (!listing) {
      return createErrorResponse({
        error: 'Listing not found.',
        code: ErrorCode.NOT_FOUND,
      });
    }

    const trimmedUrl = listing.url?.trim();

    if (!trimmedUrl) {
      return createErrorResponse({
        error: 'This listing has no source URL to refresh.',
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    const tripResult = await trips.get(listing.tripId, { userId });
    if (!tripResult.success) {
      return createErrorResponse({
        error: tripResult.error,
        code: tripResult.code ?? ErrorCode.FORBIDDEN,
      });
    }

    const trip = tripResult.data;
    const isTripOwner = trip.userId === userId;
    const isListingAdder = listing.addedById === userId;

    if (!isTripOwner && !isListingAdder) {
      return createErrorResponse({
        error: 'Only the trip owner or the user who added this listing can refresh it.',
        code: ErrorCode.FORBIDDEN,
      });
    }

    const normalizedListing = await scrapeListingMetadataFromUrl(trimmedUrl);

    normalizedListing.sourceDescription = resolveRefreshedSourceDescription(
      listing.sourceDescription,
      normalizedListing.sourceDescription,
    );
    normalizedListing.roomBreakdown = resolveRefreshedRoomBreakdown(
      listing.roomBreakdown,
      normalizedListing.roomBreakdown,
    );
    // `listing.title` is always non-null per Prisma schema, so the merged title
    // is too — narrow the type manually since keepExisting widens to `string | null`.
    const mergedTitle = normalizedListing.title ?? listing.title;
    normalizedListing.title = mergedTitle;
    normalizedListing.price = keepExisting(normalizedListing.price, listing.price);
    normalizedListing.bedroomCount = keepExisting(normalizedListing.bedroomCount, listing.bedroomCount);
    normalizedListing.bedCount = keepExisting(normalizedListing.bedCount, listing.bedCount);
    normalizedListing.bathroomCount = keepExisting(normalizedListing.bathroomCount, listing.bathroomCount);
    normalizedListing.address = keepExisting(normalizedListing.address, listing.address);
    // Treat photos as authoritative on refresh: stale images are worse than no images.

    const effectivePhotoUrls = refreshedPhotoUrlsForImportStatus(normalizedListing);
    normalizedListing.importStatus = recalculateImportStatus({
      title: normalizedListing.title,
      address: normalizedListing.address,
      price: normalizedListing.price,
      photoUrls: effectivePhotoUrls,
    });

    await applyNormalizedImportToListingId(listingId, normalizedListing);

    const missingFields = getMissingImportedListingFields({
      ...normalizedListing,
      photoUrls: effectivePhotoUrls,
    });

    revalidatePath(`/trips/${listing.tripId}`);

    return createSuccessResponse({
      data: {
        listingId,
        listingTitle: mergedTitle,
        tripId: listing.tripId,
        importStatus: normalizedListing.importStatus,
        missingFields,
      },
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix: 'Failed to refresh listing:',
    });
  }
}
