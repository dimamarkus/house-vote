-- Add structured guest counts while preserving the legacy total.
ALTER TABLE "Trip" ADD COLUMN "adultCount" INTEGER;
ALTER TABLE "Trip" ADD COLUMN "childCount" INTEGER;

UPDATE "Trip"
SET
  "adultCount" = "numberOfPeople",
  "childCount" = 0
WHERE "numberOfPeople" IS NOT NULL;
