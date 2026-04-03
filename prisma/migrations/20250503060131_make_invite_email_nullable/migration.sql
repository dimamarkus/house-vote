/*
  Warnings:

  - A unique constraint covering the columns `[tripId,email]` on the table `TripInvitation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TripInvitation" ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TripInvitation_tripId_email_key" ON "TripInvitation"("tripId", "email");
