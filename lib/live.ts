/** The four kinds of live user (KOL, Affiliate Special, Founder, HQ). */
export const LIVE_USER_TYPES = ["KOL", "Affiliate Special", "Founder", "HQ"] as const;
export type LiveUserType = (typeof LIVE_USER_TYPES)[number];
