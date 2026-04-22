-- AlterEnum: add BOOKING to ListingSource so the Booking.com adapter can persist rows with a branded source.
-- Enum values are additive in Postgres and safe to ship without a data backfill.
ALTER TYPE "ListingSource" ADD VALUE IF NOT EXISTS 'BOOKING';
