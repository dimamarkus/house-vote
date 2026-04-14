export interface PublishedGuestSessionValue {
  guestId: string;
  guestDisplayName: string;
}

export function getPublishedGuestSessionKey(tripId: string) {
  return `housevote_published_guest_${tripId}`;
}

export const PUBLISHED_GUEST_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function parsePublishedGuestSession(rawValue: string | null): PublishedGuestSessionValue | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as PublishedGuestSessionValue;
    if (!parsed.guestId || !parsed.guestDisplayName) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function serializePublishedGuestSession(session: PublishedGuestSessionValue): string {
  return JSON.stringify(session);
}

export function encodePublishedGuestSessionCookieValue(session: PublishedGuestSessionValue): string {
  return encodeURIComponent(serializePublishedGuestSession(session));
}

export function decodePublishedGuestSessionCookieValue(rawValue: string | undefined): PublishedGuestSessionValue | null {
  if (!rawValue) {
    return null;
  }

  try {
    return parsePublishedGuestSession(decodeURIComponent(rawValue));
  } catch {
    return null;
  }
}
