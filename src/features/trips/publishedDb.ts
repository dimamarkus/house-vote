import { randomUUID } from 'node:crypto';
import { db, ListingCommentKind, ListingStatus, Prisma, TripGuestSource } from 'db';
import { scrapeListingMetadataFromUrl } from '@/features/listings/import/scrapeListingMetadataFromUrl';
import { upsertImportedListing } from '@/features/listings/import/upsertImportedListing';
import { assertTripOwnerId } from './guards';

const publishedVoteInclude = Prisma.validator<Prisma.TripVoteInclude>()({
  guest: {
    select: {
      id: true,
      guestDisplayName: true,
    },
  },
});

const publishedCommentInclude = Prisma.validator<Prisma.ListingCommentInclude>()({
  guest: {
    select: {
      id: true,
      guestDisplayName: true,
    },
  },
});

const publishedListingInclude = Prisma.validator<Prisma.ListingInclude>()({
  photos: true,
  votes: {
    include: publishedVoteInclude,
    orderBy: {
      createdAt: 'asc',
    },
  },
  comments: {
    where: {
      hiddenAt: null,
    },
    include: publishedCommentInclude,
    orderBy: {
      createdAt: 'asc',
    },
  },
});

const publishedTripShareSelect = Prisma.validator<Prisma.TripShareSelect>()({
  id: true,
  tripId: true,
  token: true,
  isPublished: true,
  votingOpen: true,
  commentsOpen: true,
  allowGuestSuggestions: true,
  publishedAt: true,
  trip: {
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      startDate: true,
      endDate: true,
      numberOfPeople: true,
      guests: {
        include: {
          votes: {
            select: {
              listingId: true,
            },
          },
        },
        orderBy: {
          guestDisplayName: 'asc',
        },
      },
    },
  },
});

const ownerShareListingSelect = Prisma.validator<Prisma.ListingSelect>()({
  id: true,
  title: true,
  status: true,
});

const ownerCommentSelect = Prisma.validator<Prisma.ListingCommentSelect>()({
  id: true,
  kind: true,
  body: true,
  createdAt: true,
  hiddenAt: true,
  guest: {
    select: {
      id: true,
      guestDisplayName: true,
    },
  },
  listing: {
    select: {
      id: true,
      title: true,
    },
  },
});

type DbClient = typeof db | Prisma.TransactionClient;

type PublishedTripShareQueryRecord = Prisma.TripShareGetPayload<{
  select: typeof publishedTripShareSelect;
}>;

export type PublishedTripListingRecord = Prisma.ListingGetPayload<{
  include: typeof publishedListingInclude;
}>;

export type PublishedTripCommentRecord = Prisma.ListingCommentGetPayload<{
  include: typeof publishedCommentInclude;
}>;

export type PublishedTripGuestRecord = PublishedTripShareQueryRecord['trip']['guests'][number];

export type PublishedTripShareRecord = Omit<PublishedTripShareQueryRecord, 'trip'> & {
  trip: Omit<PublishedTripShareQueryRecord['trip'], 'guests'>;
  guests: PublishedTripGuestRecord[];
};

export type OwnerTripShareListingRecord = Prisma.ListingGetPayload<{
  select: typeof ownerShareListingSelect;
}>;

export type OwnerTripCommentRecord = Prisma.ListingCommentGetPayload<{
  select: typeof ownerCommentSelect;
}>;

function mapPublishedTripShareRecord(share: PublishedTripShareQueryRecord): PublishedTripShareRecord {
  const { trip, ...shareFields } = share;
  const { guests, ...tripFields } = trip;

  return {
    ...shareFields,
    trip: tripFields,
    guests,
  };
}

function normalizeGuestDisplayName(displayName: string) {
  return displayName.trim().replace(/\s+/g, ' ');
}

function assertTripOwner(tripId: string, userId: string, dbClient: DbClient) {
  return assertTripOwnerId(tripId, userId, 'manage published voting', dbClient);
}

async function findGuestByName(tripId: string, displayName: string, dbClient: DbClient) {
  return dbClient.tripGuest.findFirst({
    where: {
      tripId,
      guestDisplayName: {
        equals: displayName,
        mode: 'insensitive',
      },
    },
  });
}

async function createGuest(
  tripId: string,
  displayName: string,
  source: typeof TripGuestSource[keyof typeof TripGuestSource],
  dbClient: DbClient,
) {
  const normalizedName = normalizeGuestDisplayName(displayName);

  if (!normalizedName) {
    throw new Error('Guest name cannot be empty.');
  }

  const existingGuest = await findGuestByName(tripId, normalizedName, dbClient);

  if (existingGuest) {
    throw new Error(`"${existingGuest.guestDisplayName}" is already on the guest list.`);
  }

  return dbClient.tripGuest.create({
    data: {
      tripId,
      guestDisplayName: normalizedName,
      source,
    },
  });
}

async function ensureShareRecord(tripId: string, dbClient: DbClient) {
  return dbClient.tripShare.upsert({
    where: {
      tripId,
    },
    update: {},
    create: {
      tripId,
      token: randomUUID(),
    },
  });
}

async function getShareByToken(token: string) {
  return db.tripShare.findUnique({
    where: { token },
    select: publishedTripShareSelect,
  });
}

async function getShareByTripId(tripId: string, dbClient: DbClient) {
  return dbClient.tripShare.findUnique({
    where: { tripId },
    select: {
      token: true,
    },
  });
}

async function assertPublishedShare(token: string) {
  const share = await getShareByToken(token);

  if (!share) {
    throw new Error('This voting link is invalid.');
  }

  if (!share.isPublished) {
    throw new Error('This voting link is not published right now.');
  }

  return mapPublishedTripShareRecord(share);
}

async function assertGuestInTrip(tripId: string, guestId: string, dbClient: DbClient) {
  const guest = await dbClient.tripGuest.findUnique({
    where: { id: guestId },
  });

  if (!guest || guest.tripId !== tripId) {
    throw new Error('Guest session is no longer valid for this trip.');
  }

  return guest;
}

async function assertPotentialListing(tripId: string, listingId: string, dbClient: DbClient) {
  const listing = await dbClient.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      tripId: true,
      status: true,
    },
  });

  if (!listing || listing.tripId !== tripId) {
    throw new Error('Listing not found for this trip.');
  }

  if (listing.status !== ListingStatus.POTENTIAL) {
    throw new Error('Only active listings can receive votes.');
  }

  return listing;
}

async function assertListingInTrip(tripId: string, listingId: string, dbClient: DbClient) {
  const listing = await dbClient.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      tripId: true,
    },
  });

  if (!listing || listing.tripId !== tripId) {
    throw new Error('Listing not found for this trip.');
  }

  return listing;
}

export const publishedTrips = {
  getPublishedTripByToken: async (token: string) => {
    const share = await getShareByToken(token);

    if (!share) {
      return null;
    }

    const listings = await db.listing.findMany({
      where: {
        tripId: share.tripId,
      },
      include: publishedListingInclude,
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
    });

    return {
      share: mapPublishedTripShareRecord(share),
      listings,
    };
  },

  getOwnerTripShareSummary: async (tripId: string, ownerId: string) => {
    await assertTripOwner(tripId, ownerId, db);

    const share = await db.tripShare.findUnique({
      where: {
        tripId,
      },
      select: publishedTripShareSelect,
    });

    const listings = await db.listing.findMany({
      where: {
        tripId,
      },
      select: ownerShareListingSelect,
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
    });

    const comments = await db.listingComment.findMany({
      where: {
        tripId,
      },
      select: ownerCommentSelect,
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
    });

    return {
      share: share ? mapPublishedTripShareRecord(share) : null,
      listings,
      comments,
    };
  },

  publish: async (tripId: string, ownerId: string) => {
    await assertTripOwner(tripId, ownerId, db);

    const existingShare = await ensureShareRecord(tripId, db);

    return db.tripShare.update({
      where: {
        id: existingShare.id,
      },
      data: {
        isPublished: true,
        publishedAt: existingShare.publishedAt ?? new Date(),
      },
    });
  },

  unpublish: async (tripId: string, ownerId: string) => {
    await assertTripOwner(tripId, ownerId, db);

    const share = await ensureShareRecord(tripId, db);

    return db.tripShare.update({
      where: {
        id: share.id,
      },
      data: {
        isPublished: false,
      },
    });
  },

  updateSettings: async (
    tripId: string,
    ownerId: string,
    data: {
      votingOpen?: boolean;
      commentsOpen?: boolean;
      allowGuestSuggestions?: boolean;
    },
  ) => {
    await assertTripOwner(tripId, ownerId, db);

    const share = await ensureShareRecord(tripId, db);

    return db.tripShare.update({
      where: {
        id: share.id,
      },
      data,
    });
  },

  rotateToken: async (tripId: string, ownerId: string) => {
    await assertTripOwner(tripId, ownerId, db);

    const share = await ensureShareRecord(tripId, db);

    return db.tripShare.update({
      where: {
        id: share.id,
      },
      data: {
        token: randomUUID(),
      },
    });
  },

  addOwnerGuest: async (tripId: string, ownerId: string, displayName: string) => {
    await assertTripOwner(tripId, ownerId, db);

    return createGuest(tripId, displayName, TripGuestSource.OWNER_ADDED, db);
  },

  removeGuest: async (tripId: string, ownerId: string, guestId: string) => {
    await assertTripOwner(tripId, ownerId, db);

    const guest = await assertGuestInTrip(tripId, guestId, db);

    return db.tripGuest.delete({
      where: {
        id: guest.id,
      },
    });
  },

  claimGuestSession: async (token: string, guestId: string) => {
    const share = await assertPublishedShare(token);
    const guest = await assertGuestInTrip(share.tripId, guestId, db);

    return {
      share,
      guest,
    };
  },

  castVote: async (token: string, guestId: string, listingId: string) => {
    const share = await assertPublishedShare(token);

    if (!share.votingOpen) {
      throw new Error('Voting is closed for this trip.');
    }

    await assertGuestInTrip(share.tripId, guestId, db);

    return db.$transaction(async (tx) => {
      const existingVote = await tx.tripVote.findUnique({
        where: {
          tripId_guestId: {
            tripId: share.tripId,
            guestId,
          },
        },
      });

      if (existingVote?.listingId === listingId) {
        await tx.tripVote.delete({
          where: {
            id: existingVote.id,
          },
        });

        return {
          tripId: share.tripId,
          guestId,
          listingId: null,
        };
      }

      await assertPotentialListing(share.tripId, listingId, tx);

      const vote = await tx.tripVote.upsert({
        where: {
          tripId_guestId: {
            tripId: share.tripId,
            guestId,
          },
        },
        update: {
          listingId,
        },
        create: {
          tripId: share.tripId,
          guestId,
          listingId,
        },
      });

      return {
        tripId: vote.tripId,
        guestId: vote.guestId,
        listingId: vote.listingId,
      };
    });
  },

  addFeedback: async (
    token: string,
    guestId: string,
    listingId: string,
    kind: ListingCommentKind,
    body: string,
  ) => {
    const share = await assertPublishedShare(token);

    if (!share.commentsOpen) {
      throw new Error('Comments are closed for this trip.');
    }

    const normalizedBody = body.trim();

    if (!normalizedBody) {
      throw new Error('Comment cannot be empty.');
    }

    await assertGuestInTrip(share.tripId, guestId, db);
    await assertListingInTrip(share.tripId, listingId, db);

    return db.listingComment.create({
      data: {
        tripId: share.tripId,
        guestId,
        listingId,
        kind,
        body: normalizedBody,
      },
      include: publishedCommentInclude,
    });
  },

  setCommentHidden: async (tripId: string, ownerId: string, commentId: string, hidden: boolean) => {
    await assertTripOwner(tripId, ownerId, db);

    const comment = await db.listingComment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        id: true,
        tripId: true,
      },
    });

    if (!comment || comment.tripId !== tripId) {
      throw new Error('Comment not found for this trip.');
    }

    const updatedComment = await db.listingComment.update({
      where: {
        id: comment.id,
      },
      data: {
        hiddenAt: hidden ? new Date() : null,
      },
    });

    const share = await getShareByTripId(tripId, db);

    return {
      comment: updatedComment,
      shareToken: share?.token ?? null,
    };
  },

  updateGuestListingDetails: async (
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
  ) => {
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
  },

  submitGuestListingUrl: async (token: string, guestId: string, url: string) => {
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
  },
};
