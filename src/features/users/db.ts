import { db } from 'db';
import { Prisma } from 'db';
import { handleDbOperation } from '@/core/responses';
import { ErrorCode } from '@/core/errors';

// Database operations for users
export const users = {
  // Create or find a user
  createOrFind: async (userId: string, options?: { tx?: Prisma.TransactionClient }) => {
    const dbClient = options?.tx || db;
    return handleDbOperation(async () => {
      // Check if user exists
      let user = await dbClient.user.findUnique({
        where: { id: userId }
      });

      // If not, create new user
      if (!user) {
        user = await dbClient.user.create({
          data: { id: userId }
        });
      }

      return user;
    }, 'Failed to create or find user:', ErrorCode.DATABASE_ERROR);
  }
};