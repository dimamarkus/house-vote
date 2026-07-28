-- CreateEnum
CREATE TYPE "PartyUnit" AS ENUM ('GUEST', 'FAMILY');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "partyUnit" "PartyUnit" NOT NULL DEFAULT 'GUEST';
