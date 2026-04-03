-- CreateEnum
CREATE TYPE "ListingSource" AS ENUM ('MANUAL', 'AIRBNB', 'VRBO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ListingImportMethod" AS ENUM ('MANUAL', 'URL_FETCH', 'EXTENSION');

-- CreateEnum
CREATE TYPE "ListingImportStatus" AS ENUM ('NOT_IMPORTED', 'PARTIAL', 'COMPLETE', 'FAILED');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "importError" TEXT,
ADD COLUMN     "importMethod" "ListingImportMethod" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "importStatus" "ListingImportStatus" NOT NULL DEFAULT 'NOT_IMPORTED',
ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "rawImportPayload" JSONB,
ADD COLUMN     "source" "ListingSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceExternalId" TEXT;

-- CreateTable
CREATE TABLE "ListingPhoto" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripImportToken" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "TripImportToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingPhoto_listingId_idx" ON "ListingPhoto"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingPhoto_listingId_position_key" ON "ListingPhoto"("listingId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TripImportToken_tripId_key" ON "TripImportToken"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripImportToken_tokenHash_key" ON "TripImportToken"("tokenHash");

-- CreateIndex
CREATE INDEX "TripImportToken_tripId_idx" ON "TripImportToken"("tripId");

-- CreateIndex
CREATE INDEX "Listing_source_importStatus_idx" ON "Listing"("source", "importStatus");

-- CreateIndex
CREATE INDEX "Listing_sourceExternalId_idx" ON "Listing"("sourceExternalId");

-- AddForeignKey
ALTER TABLE "ListingPhoto" ADD CONSTRAINT "ListingPhoto_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripImportToken" ADD CONSTRAINT "TripImportToken_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
