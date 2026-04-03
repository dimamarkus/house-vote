-- CreateTable
CREATE TABLE "TripGuest" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "guestDisplayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripGuest_tripId_idx" ON "TripGuest"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripGuest_tripId_guestDisplayName_key" ON "TripGuest"("tripId", "guestDisplayName");

-- AddForeignKey
ALTER TABLE "TripGuest" ADD CONSTRAINT "TripGuest_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
