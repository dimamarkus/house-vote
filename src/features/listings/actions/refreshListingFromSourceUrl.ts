'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { ErrorCode } from '@/core/errors';
import { validateActionInput } from '@/core/form-data';
import { createErrorResponse, createSuccessResponse } from '@/core/responses';
import { trips } from '@/features/trips/db';
import { LISTING_IMPORT_UNSUPPORTED_SOURCE_MESSAGE } from '../import/constants';
import type { RoomBreakdown } from '../import/types';
import { getMissingImportedListingFields } from '../import/normalizeImportedListing';
import { scrapeListingMetadataFromUrl } from '../import/scrapeListingMetadataFromUrl';
import { applyNormalizedImportToListingId } from '../import/upsertImportedListing';
import { listings } from '../db';

const RefreshListingInputSchema = z.object({
  listingId: z.string().cuid({ message: 'A valid listing id is required.' }),
});

function normalizeText(value: string | null | undefined): string | null {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function stripTrailingEllipsis(value: string): string {
  return value.replace(/(?:\.\.\.|…)\s*$/, '').trim();
}

function resolveRefreshedSourceDescription(
  existingDescription: string | null | undefined,
  refreshedDescription: string | null,
): string | null {
  const existingText = normalizeText(existingDescription);
  const refreshedText = normalizeText(refreshedDescription);

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
    const listingResponse = await listings.get(listingId, {
      select: {
        id: true,
        tripId: true,
        url: true,
        addedById: true,
        sourceDescription: true,
        roomBreakdown: true,
      },
    });

    if (!listingResponse.success || !listingResponse.data) {
      return createErrorResponse({
        error: 'Listing not found.',
        code: ErrorCode.NOT_FOUND,
      });
    }

    const listing = listingResponse.data;
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

    if (normalizedListing.source === 'UNKNOWN') {
      return createErrorResponse({
        error: LISTING_IMPORT_UNSUPPORTED_SOURCE_MESSAGE,
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    normalizedListing.sourceDescription = resolveRefreshedSourceDescription(
      listing.sourceDescription,
      normalizedListing.sourceDescription,
    );
    normalizedListing.roomBreakdown = resolveRefreshedRoomBreakdown(
      listing.roomBreakdown,
      normalizedListing.roomBreakdown,
    );

    await applyNormalizedImportToListingId(listingId, normalizedListing);

    const missingFields = getMissingImportedListingFields(normalizedListing);

    revalidatePath(`/trips/${listing.tripId}`);

    return createSuccessResponse({
      data: {
        listingId,
        listingTitle: normalizedListing.title,
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
