export const createPrismaClient = <T extends object>(
  createClient: () => T,
): T => {
  const globalForPrisma = globalThis as { prisma?: T };
  const prisma = globalForPrisma.prisma ?? createClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
};
