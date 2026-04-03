// Use the Prisma client generated for this app
import { PrismaClient } from './generated/client';
import { createPrismaClient } from './src/compat/core/prisma';

/**
 * App-specific Prisma Client instance
 * Uses the schema.prisma file from this app's /prisma directory
 */
export const db: PrismaClient = createPrismaClient(PrismaClient);

// Re-export generated Prisma types and enums for convenient imports from 'db'
export * from './generated/client';