-- CreateEnum
CREATE TYPE "TripGuestSource" AS ENUM ('OWNER_ADDED', 'SELF_ADDED');

-- AlterTable
ALTER TABLE "Listing"
ADD COLUMN     "addedByGuestId" TEXT;

-- AlterTable
ALTER TABLE "TripGuest"
ADD COLUMN     "source" "TripGuestSource" NOT NULL DEFAULT 'SELF_ADDED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "TripShare" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "votingOpen" BOOLEAN NOT NULL DEFAULT true,
    "allowGuestSuggestions" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripVote" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Listing_addedByGuestId_idx" ON "Listing"("addedByGuestId");

-- CreateIndex
CREATE UNIQUE INDEX "TripShare_tripId_key" ON "TripShare"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripShare_token_key" ON "TripShare"("token");

-- CreateIndex
CREATE INDEX "TripShare_token_idx" ON "TripShare"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TripVote_tripId_guestId_key" ON "TripVote"("tripId", "guestId");

-- CreateIndex
CREATE INDEX "TripVote_tripId_idx" ON "TripVote"("tripId");

-- CreateIndex
CREATE INDEX "TripVote_guestId_idx" ON "TripVote"("guestId");

-- CreateIndex
CREATE INDEX "TripVote_listingId_idx" ON "TripVote"("listingId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_addedByGuestId_fkey" FOREIGN KEY ("addedByGuestId") REFERENCES "TripGuest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripShare" ADD CONSTRAINT "TripShare_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripVote" ADD CONSTRAINT "TripVote_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripVote" ADD CONSTRAINT "TripVote_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "TripGuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripVote" ADD CONSTRAINT "TripVote_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
