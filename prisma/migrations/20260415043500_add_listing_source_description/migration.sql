-- AlterTable
ALTER TABLE "Listing"
ADD COLUMN IF NOT EXISTS "sourceDescription" TEXT;
