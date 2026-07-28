-- Allow a guest to vote for multiple listings per trip.
-- Widen the per-guest uniqueness to include the listing so each
-- (trip, guest, listing) pair is unique instead of one vote per guest.
DROP INDEX "TripVote_tripId_guestId_key";
CREATE UNIQUE INDEX "TripVote_tripId_guestId_listingId_key" ON "TripVote"("tripId", "guestId", "listingId");
