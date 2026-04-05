const SLEEPS_PATTERN = /\bsleeps[:\s]+(\d+)/i;
const WHOLE_NUMBER_PATTERN = /\b\d+\b/g;

/**
 * Guest capacity from imported room summary (e.g. "6 bedrooms (sleeps 30)")
 * or from listing titles that include "Sleeps 30".
 */
export function extractSleepsCount(listing: {
  title: string;
  roomBreakdown?: { summary?: string | null } | null;
}): number | null {
  const summary = listing.roomBreakdown?.summary;
  if (summary) {
    const fromSummary = summary.match(SLEEPS_PATTERN);
    if (fromSummary) {
      return parseInt(fromSummary[1], 10);
    }
  }
  const fromTitle = listing.title.match(SLEEPS_PATTERN);
  if (fromTitle) {
    return parseInt(fromTitle[1], 10);
  }
  return null;
}

export function extractBedCountFromRoomBreakdown(roomBreakdown?: {
  rooms?: Array<{ beds: string }>;
} | null): number | null {
  if (!roomBreakdown?.rooms?.length) {
    return null;
  }

  let totalBeds = 0;
  for (const room of roomBreakdown.rooms) {
    const matches = room.beds.match(WHOLE_NUMBER_PATTERN) ?? [];
    for (const match of matches) {
      totalBeds += Number(match);
    }
  }

  return totalBeds > 0 ? totalBeds : null;
}
