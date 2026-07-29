-- Rejection metadata for listings: reason, actor (user or guest), timestamp.
-- Additive only; existing rows get NULLs (no rejection recorded yet).

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedById" TEXT,
ADD COLUMN     "rejectedByGuestId" TEXT,
ADD COLUMN     "rejectedByName" TEXT;

-- CreateIndex
CREATE INDEX "Listing_rejectedById_idx" ON "Listing"("rejectedById");

-- CreateIndex
CREATE INDEX "Listing_rejectedByGuestId_idx" ON "Listing"("rejectedByGuestId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_rejectedByGuestId_fkey" FOREIGN KEY ("rejectedByGuestId") REFERENCES "TripGuest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
