export const createPrismaClient = <T extends object>(
  PrismaClientConstructor: new () => T,
): T => {
  const globalForPrisma = globalThis as { prisma?: T };
  const prisma = globalForPrisma.prisma ?? new PrismaClientConstructor();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
};
