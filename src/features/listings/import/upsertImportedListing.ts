import { db, Prisma } from 'db';
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

/** Shared field map for URL import writes (create + update). */
function buildImportedListingImportPayload(
  listing: NormalizedImportedListing,
  importedAt: Date,
): Prisma.ListingUncheckedUpdateInput {
  return {
    title: listing.title,
    address: listing.address,
    url: listing.canonicalUrl,
    price: listing.price,
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

export async function applyNormalizedImportToListingId(
  listingId: string,
  listing: NormalizedImportedListing,
) {
  const importedAt = new Date();
  const listingData = buildImportedListingImportPayload(listing, importedAt);

  return db.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: listingId },
      data: listingData,
    });

    if (listing.photoUrls.length > 0) {
      await tx.listingPhoto.deleteMany({
        where: { listingId },
      });

      await tx.listingPhoto.createMany({
        data: listing.photoUrls.map((url, index) => ({
          listingId,
          url,
          position: index,
        })),
      });
    }

    return tx.listing.findUniqueOrThrow({
      where: { id: listingId },
      include: {
        photos: true,
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
  const listingData = buildImportedListingImportPayload(listing, importedAt);

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
          include: {
            photos: true,
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
          include: {
            photos: true,
          },
        });

    if (listing.photoUrls.length > 0) {
      await tx.listingPhoto.deleteMany({
        where: {
          listingId: savedListing.id,
        },
      });

      await tx.listingPhoto.createMany({
        data: listing.photoUrls.map((url, index) => ({
          listingId: savedListing.id,
          url,
          position: index,
        })),
      });
    }

    return tx.listing.findUniqueOrThrow({
      where: {
        id: savedListing.id,
      },
      include: {
        photos: true,
      },
    });
  });
}
