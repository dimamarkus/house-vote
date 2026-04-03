export const INVITE_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
} as const;

export type InviteStatusValue =
  (typeof INVITE_STATUS)[keyof typeof INVITE_STATUS];
