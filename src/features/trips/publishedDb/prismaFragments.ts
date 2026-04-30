import { Prisma } from 'db';

/**
 * Prisma `validator` fragments shared by every domain file in
 * `publishedDb/`. Extracted so each split file can import exactly
 * the include/select it needs and type-check the derived record
 * type through `Prisma.*GetPayload<{ include: typeof X }>`.
 *
 * Keep these purely declarative — no runtime helpers here.
 */

export const publishedVoteInclude = Prisma.validator<Prisma.TripVoteInclude>()({
  guest: {
    select: {
      id: true,
      guestDisplayName: true,
    },
  },
});

export const publishedCommentInclude = Prisma.validator<Prisma.ListingCommentInclude>()({
  guest: {
    select: {
      id: true,
      guestDisplayName: true,
    },
  },
});

export const publishedListingInclude = Prisma.validator<Prisma.ListingInclude>()({
  photos: {
    orderBy: {
      position: 'asc',
    },
  },
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

export const publishedTripShareSelect = Prisma.validator<Prisma.TripShareSelect>()({
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
      adultCount: true,
      childCount: true,
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

export const ownerShareListingSelect = Prisma.validator<Prisma.ListingSelect>()({
  id: true,
  title: true,
  status: true,
});

export const ownerCommentSelect = Prisma.validator<Prisma.ListingCommentSelect>()({
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
