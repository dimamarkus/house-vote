-- Collapse any existing SELF_ADDED guests into OWNER_ADDED since self-add is no longer supported.
UPDATE "TripGuest" SET "source" = 'OWNER_ADDED' WHERE "source" = 'SELF_ADDED';

-- Recreate the enum with only OWNER_ADDED.
ALTER TYPE "TripGuestSource" RENAME TO "TripGuestSource_old";
CREATE TYPE "TripGuestSource" AS ENUM ('OWNER_ADDED');

ALTER TABLE "TripGuest" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "TripGuest" ALTER COLUMN "source" TYPE "TripGuestSource" USING "source"::text::"TripGuestSource";
ALTER TABLE "TripGuest" ALTER COLUMN "source" SET DEFAULT 'OWNER_ADDED';

DROP TYPE "TripGuestSource_old";
