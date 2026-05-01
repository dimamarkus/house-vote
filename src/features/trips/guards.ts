import { db, Prisma } from 'db';

type DbClient = typeof db | Prisma.TransactionClient;

/**
 * Ensure `userId` owns the trip identified by `tripId`. Used by every
 * trip-admin code path (shareable invites, import token rotation, the
 * published-share lifecycle). Throws a descriptive error if the trip
 * doesn't exist or the user isn't the owner.
 *
 * The `action` parameter is interpolated into the forbidden-message so
 * the UI toast matches the action that was attempted, e.g.
 * `assertTripOwnerId(tripId, userId, 'rotate import tokens')` produces
 * `Only the trip owner can rotate import tokens.` when the caller
 * isn't the owner.
 *
 * `dbClient` defaults to the shared `db` singleton but accepts a
 * transaction client when the caller is already inside `$transaction`.
 */
export async function assertTripOwnerId(
  tripId: string,
  userId: string,
  action: string,
  dbClient: DbClient = db,
): Promise<void> {
  const trip = await dbClient.trip.findUnique({
    where: { id: tripId },
    select: { userId: true },
  });

  if (!trip) {
    throw new Error('Trip not found.');
  }

  if (trip.userId !== userId) {
    throw new Error(`Only the trip owner can ${action}.`);
  }
}

/**
 * Ensure `userId` can access the trip as either owner or collaborator. This is
 * the right guard for member-level workflows like extension imports where
 * collaborators should be able to contribute listings.
 */
export async function assertTripMemberId(
  tripId: string,
  userId: string,
  action: string,
  dbClient: DbClient = db,
): Promise<void> {
  const trip = await dbClient.trip.findUnique({
    where: { id: tripId },
    select: {
      userId: true,
      collaborators: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!trip) {
    throw new Error('Trip not found.');
  }

  const isOwner = trip.userId === userId;
  const isCollaborator = trip.collaborators.some((collaborator) => collaborator.id === userId);

  if (!isOwner && !isCollaborator) {
    throw new Error(`You do not have permission to ${action} on this trip.`);
  }
}
