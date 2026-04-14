-- AlterTable
ALTER TABLE "TripShare"
ADD COLUMN     "commentsOpen" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ListingComment" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingComment_tripId_idx" ON "ListingComment"("tripId");

-- CreateIndex
CREATE INDEX "ListingComment_guestId_idx" ON "ListingComment"("guestId");

-- CreateIndex
CREATE INDEX "ListingComment_listingId_idx" ON "ListingComment"("listingId");

-- AddForeignKey
ALTER TABLE "ListingComment" ADD CONSTRAINT "ListingComment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingComment" ADD CONSTRAINT "ListingComment_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "TripGuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingComment" ADD CONSTRAINT "ListingComment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
