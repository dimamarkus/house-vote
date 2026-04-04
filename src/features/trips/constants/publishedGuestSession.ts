export interface PublishedGuestSessionValue {
  guestId: string;
  guestDisplayName: string;
}

export function getPublishedGuestSessionKey(tripId: string) {
  return `housevote_published_guest_${tripId}`;
}
