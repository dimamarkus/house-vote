-- DropIndex
DROP INDEX "Like_userId_listingId_key";

-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "guestDisplayName" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "addedByGuestName" TEXT,
ALTER COLUMN "addedById" DROP NOT NULL;
