-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "roomBreakdown" JSONB;

-- AlterTable
ALTER TABLE "TripGuest" ALTER COLUMN "updatedAt" DROP DEFAULT;
