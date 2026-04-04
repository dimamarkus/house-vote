export const LISTING_STATUS = {
  POTENTIAL: "POTENTIAL",
  REJECTED: "REJECTED",
} as const;

export type ListingStatusValue =
  (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];

export function isVoteEligibleListingStatus(status: ListingStatusValue) {
  return status === LISTING_STATUS.POTENTIAL;
}

export function formatListingStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
