import { db, Prisma } from 'db';
import { computeNightsFromDates } from '@/features/listings/utils/priceBasis';
import type { NormalizedImportedListing } from './types';

function toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null) {
    return Prisma.JsonNull;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toJsonValue(entry)) as Prisma.InputJsonArray;
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, toJsonValue(entry)]),
    ) as Prisma.InputJsonObject;
  }

  return String(value);
}

/**
 * Convert a normalized import price to a stored stay-total when the scrape
 * was nightly and the trip has a usable night count. Totals and undated trips
 * pass through unchanged.
 */
function toStoredTotalPrice(
  listing: NormalizedImportedListing,
  tripNights: number | null,
): number | null {
  if (listing.price === null) {
    return null;
  }

  if (listing.nightlyPriceSource === 'SCRAPED_NIGHTLY' && tripNights && tripNights > 0) {
    return listing.price * tripNights;
  }

  return listing.price;
}

async function getTripNights(tripId: string): Promise<number | null> {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: {
      startDate: true,
      endDate: true,
    },
  });

  if (!trip) {
    return null;
  }

  return computeNightsFromDates(trip.startDate, trip.endDate);
}

/** Shared field map for URL import writes (create + update). */
function buildImportedListingImportPayload(
  listing: NormalizedImportedListing,
  importedAt: Date,
  tripNights: number | null,
): Prisma.ListingUncheckedUpdateInput {
  if (listing.title === null) {
    // Unreachable in practice — `importListingCapture` throws before calling this
    // on fresh imports, and the refresh path merges the existing title back in
    // before calling `applyNormalizedImportToListingId`. This guard makes the
    // invariant explicit at the DB boundary so a future caller can't bypass it.
    throw new Error(
      'Refusing to persist an imported listing without a title. Caller must enforce a non-null title before writing to the DB.',
    );
  }

  return {
    title: listing.title,
    address: listing.address,
    url: listing.canonicalUrl,
    price: toStoredTotalPrice(listing, tripNights),
    nightlyPriceSource: listing.nightlyPriceSource,
    priceQuotedStartDate: listing.priceQuotedStartDate,
    priceQuotedEndDate: listing.priceQuotedEndDate,
    bedroomCount: listing.bedroomCount,
    bedCount: listing.bedCount,
    bathroomCount: listing.bathroomCount,
    sourceDescription: listing.sourceDescription,
    notes: listing.notes,
    imageUrl: listing.imageUrl,
    source: listing.source,
    importMethod: listing.importMethod,
    importStatus: listing.importStatus,
    sourceExternalId: listing.sourceExternalId,
    importedAt,
    importError: null,
    rawImportPayload: toJsonValue(listing.rawImportPayload),
    roomBreakdown: listing.roomBreakdown ? toJsonValue(listing.roomBreakdown) : Prisma.JsonNull,
  };
}

async function replaceListingPhotos(
  tx: Prisma.TransactionClient,
  listingId: string,
  photoUrls: string[],
) {
  await tx.listingPhoto.deleteMany({
    where: {
      listingId,
    },
  });

  if (photoUrls.length > 0) {
    await tx.listingPhoto.createMany({
      data: photoUrls.map((url, index) => ({
        listingId,
        url,
        position: index,
      })),
    });
  }
}

export async function applyNormalizedImportToListingId(
  listingId: string,
  listing: NormalizedImportedListing,
) {
  const importedAt = new Date();
  const existingListing = await db.listing.findUnique({
    where: { id: listingId },
    select: { tripId: true },
  });

  if (!existingListing) {
    throw new Error('Listing not found');
  }

  const tripNights = await getTripNights(existingListing.tripId);
  const listingData = buildImportedListingImportPayload(listing, importedAt, tripNights);

  return db.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: listingId },
      data: listingData,
    });

    await replaceListingPhotos(tx, listingId, listing.photoUrls);

    return tx.listing.findUniqueOrThrow({
      where: { id: listingId },
      include: {
        photos: {
          orderBy: {
            position: 'asc',
          },
        },
      },
    });
  });
}

interface UpsertImportedListingOptions {
  addedById?: string;
  addedByGuestId?: string;
  addedByGuestName?: string;
}

export async function upsertImportedListing(
  tripId: string,
  listing: NormalizedImportedListing,
  options?: UpsertImportedListingOptions,
) {
  const importedAt = new Date();
  const tripNights = await getTripNights(tripId);
  const listingData = buildImportedListingImportPayload(listing, importedAt, tripNights);

  return db.$transaction(async (tx) => {
    const existingListing = await tx.listing.findFirst({
      where: {
        tripId,
        url: listing.canonicalUrl,
      },
      select: {
        id: true,
        addedById: true,
        addedByGuestId: true,
      },
    });

    const savedListing = existingListing
      ? await tx.listing.update({
          where: {
            id: existingListing.id,
          },
          data: {
            ...listingData,
            ...(options?.addedById && !existingListing.addedById ? { addedById: options.addedById } : {}),
            ...(options?.addedByGuestId && !existingListing.addedByGuestId ? { addedByGuestId: options.addedByGuestId } : {}),
            ...(options?.addedByGuestName ? { addedByGuestName: options.addedByGuestName } : {}),
          },
          select: {
            id: true,
          },
        })
      : await tx.listing.create({
          data: {
            ...listingData,
            tripId,
            ...(options?.addedById ? { addedById: options.addedById } : {}),
            ...(options?.addedByGuestId ? { addedByGuestId: options.addedByGuestId } : {}),
            ...(options?.addedByGuestName ? { addedByGuestName: options.addedByGuestName } : {}),
            // Prisma uses distinct Create vs Update input types; scalar payload is the same at runtime.
          } as Prisma.ListingUncheckedCreateInput,
          select: {
            id: true,
          },
        });

    await replaceListingPhotos(tx, savedListing.id, listing.photoUrls);

    return tx.listing.findUniqueOrThrow({
      where: {
        id: savedListing.id,
      },
      include: {
        photos: {
          orderBy: {
            position: 'asc',
          },
        },
      },
    });
  });
}
