/*
  Warnings:

  - Added the required column `title` to the `Listing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "title" TEXT;
UPDATE "Listing" SET "title" = 'Untitled Listing' WHERE "title" IS NULL;
ALTER TABLE "Listing" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "address" DROP NOT NULL;
