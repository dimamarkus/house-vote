import { db, Prisma } from 'db';
import type { ListingFormData } from '@/features/listings/schemas';
import { scrapeListingMetadataFromUrl } from '@/features/listings/import/scrapeListingMetadataFromUrl';
import { upsertImportedListing } from '@/features/listings/import/upsertImportedListing';
import { assertGuestInTrip, assertListingInTrip, assertPublishedShare } from './guards';

/**
 * Guest-editable listing fields. Only the fields that are present in
 * `data` are written — `undefined` means "leave alone", `null`
 * means "clear". The `allow_guest_suggestions` switch is checked up
 * front so owners can pause guest edits without rejecting them
 * silently at write time.
 */
export async function updateGuestListingDetails(
  token: string,
  guestId: string,
  listingId: string,
  data: {
    price?: number | null;
    bedroomCount?: number | null;
    bedCount?: number | null;
    bathroomCount?: number | null;
    notes?: string | null;
  },
) {
  const share = await assertPublishedShare(token);

  if (!share.allowGuestSuggestions) {
    throw new Error('Guest edits are disabled for this trip right now.');
  }

  await assertGuestInTrip(share.tripId, guestId, db);
  await assertListingInTrip(share.tripId, listingId, db);

  const updateData: Prisma.ListingUpdateInput = {};

  if (typeof data.price !== 'undefined') {
    updateData.price = data.price;
  }
  if (typeof data.bedroomCount !== 'undefined') {
    updateData.bedroomCount = data.bedroomCount;
  }
  if (typeof data.bedCount !== 'undefined') {
    updateData.bedCount = data.bedCount;
  }
  if (typeof data.bathroomCount !== 'undefined') {
    updateData.bathroomCount = data.bathroomCount;
  }
  if (typeof data.notes !== 'undefined') {
    updateData.notes = data.notes;
  }

  const listing = await db.listing.update({
    where: { id: listingId },
    data: updateData,
    select: { id: true, tripId: true },
  });

  return listing;
}

/**
 * Guest path for adding a brand-new listing by URL. Runs through
 * the same scrape + upsert pipeline as the owner flow but tags the
 * resulting listing with the guest's id + name for attribution.
 */
export async function submitGuestListingUrl(token: string, guestId: string, url: string) {
  const share = await assertPublishedShare(token);

  if (!share.allowGuestSuggestions) {
    throw new Error('Guest listing suggestions are disabled right now.');
  }

  const guest = await assertGuestInTrip(share.tripId, guestId, db);
  const normalizedListing = await scrapeListingMetadataFromUrl(url);

  return upsertImportedListing(share.tripId, normalizedListing, {
    addedByGuestId: guest.id,
    addedByGuestName: guest.guestDisplayName,
  });
}

type GuestManualListingInput = Omit<ListingFormData, 'tripId'>;

/**
 * Guest path for manually creating a listing with the full form fields.
 * Trip id always comes from the published share token — never from the client.
 */
export async function createGuestListing(
  token: string,
  guestId: string,
  data: GuestManualListingInput,
) {
  const share = await assertPublishedShare(token);

  if (!share.allowGuestSuggestions) {
    throw new Error('Guest listing suggestions are disabled right now.');
  }

  const guest = await assertGuestInTrip(share.tripId, guestId, db);
  const emptyToNull = (value: string | null | undefined) => {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  };

  return db.listing.create({
    data: {
      tripId: share.tripId,
      title: data.title.trim(),
      listingType: data.listingType ?? 'HOUSE',
      url: emptyToNull(data.url),
      address: emptyToNull(data.address),
      imageUrl: emptyToNull(data.imageUrl),
      price: data.price ?? null,
      bedroomCount: data.bedroomCount ?? null,
      bedCount: data.bedCount ?? null,
      bathroomCount: data.bathroomCount ?? null,
      sourceDescription: emptyToNull(data.sourceDescription),
      notes: emptyToNull(data.notes),
      source: 'MANUAL',
      importMethod: 'MANUAL',
      nightlyPriceSource: data.price != null ? 'MANUAL' : null,
      addedByGuestId: guest.id,
      addedByGuestName: guest.guestDisplayName,
    },
    select: {
      id: true,
      tripId: true,
    },
  });
}
