-- AlterEnum: add OTHER to ListingSource (kept alongside UNKNOWN; UNKNOWN is removed in a later migration once callers stop producing it).
ALTER TYPE "ListingSource" ADD VALUE IF NOT EXISTS 'OTHER';

-- CreateEnum: ListingType (orthogonal to ListingSource).
CREATE TYPE "ListingType" AS ENUM ('HOUSE', 'HOTEL', 'APARTMENT', 'CABIN', 'RESORT', 'OTHER');

-- CreateEnum: NightlyPriceSource captures how the per-night price in `Listing.price` was derived.
CREATE TYPE "NightlyPriceSource" AS ENUM ('SCRAPED_NIGHTLY', 'DERIVED_FROM_TOTAL', 'MANUAL');

-- AlterTable: add listingType (default HOUSE for all existing rows), nightlyPriceSource (nullable; legacy rows stay null), and priceQuoted* dates.
ALTER TABLE "Listing"
ADD COLUMN IF NOT EXISTS "listingType" "ListingType" NOT NULL DEFAULT 'HOUSE',
ADD COLUMN IF NOT EXISTS "nightlyPriceSource" "NightlyPriceSource",
ADD COLUMN IF NOT EXISTS "priceQuotedStartDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "priceQuotedEndDate" TIMESTAMP(3);

-- CreateIndex: filter / group by listing type on trip dashboards.
CREATE INDEX IF NOT EXISTS "Listing_listingType_idx" ON "Listing"("listingType");
