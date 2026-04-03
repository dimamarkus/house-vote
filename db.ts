import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient as PrismaClientConstructor } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { createPrismaClient } from './src/compat/core/prisma';

function normalizePostgresConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");

    if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
      // `pg` currently treats these as aliases for `verify-full` and warns about it.
      // Normalize explicitly so dev overlay noise matches the connection behavior in use today.
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }

    return connectionString;
  } catch {
    return connectionString;
  }
}

/**
 * App-specific Prisma Client instance
 * Uses the schema.prisma file from this app's /prisma directory
 */
export const db: PrismaClient = createPrismaClient(
  () =>
    new PrismaClientConstructor({
      adapter: new PrismaPg({
        connectionString: normalizePostgresConnectionString(process.env.DATABASE_URL!),
      }),
    }),
);

// Re-export generated Prisma types and enums for convenient imports from 'db'
export {
  InviteStatus,
  ListingImportMethod,
  ListingImportStatus,
  ListingSource,
  ListingStatus,
  Prisma,
} from "@prisma/client";
export type {
  Like,
  Listing,
  ListingPhoto,
  PrismaClient,
  Trip,
  TripGuest,
  TripImportToken,
  TripInvitation,
  User,
} from "@prisma/client";