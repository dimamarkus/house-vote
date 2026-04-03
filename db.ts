import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createPrismaClient } from './src/compat/core/prisma';

/**
 * App-specific Prisma Client instance
 * Uses the schema.prisma file from this app's /prisma directory
 */
export const db: PrismaClient = createPrismaClient(
  () =>
    new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL!,
      }),
    }),
);

// Re-export generated Prisma types and enums for convenient imports from 'db'
export { InviteStatus, ListingStatus, Prisma } from "@prisma/client";
export type {
  Like,
  Listing,
  PrismaClient,
  Trip,
  TripGuest,
  TripInvitation,
  User,
} from "@prisma/client";