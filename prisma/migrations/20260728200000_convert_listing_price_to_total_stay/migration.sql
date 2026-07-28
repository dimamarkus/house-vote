-- Convert Listing.price from per-night storage to total-stay storage.
-- Multiply by trip night count when both trip dates exist and the range is positive.
-- Listings on trips without usable dates are left untouched.

UPDATE "Listing" AS listing
SET price = listing.price * nights.night_count
FROM (
  SELECT
    trip.id AS trip_id,
    GREATEST(
      1,
      ROUND(EXTRACT(EPOCH FROM (trip."endDate" - trip."startDate")) / 86400.0)
    )::int AS night_count
  FROM "Trip" AS trip
  WHERE trip."startDate" IS NOT NULL
    AND trip."endDate" IS NOT NULL
    AND trip."endDate" > trip."startDate"
) AS nights
WHERE listing."tripId" = nights.trip_id
  AND listing.price IS NOT NULL;
