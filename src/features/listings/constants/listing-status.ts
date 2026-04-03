export const LISTING_STATUS = {
  POTENTIAL: "POTENTIAL",
  REJECTED: "REJECTED",
} as const;

export type ListingStatusValue =
  (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];
