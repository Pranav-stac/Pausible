/**
 * Firestore subcollections under `users/{uid}` to avoid unbounded root collections.
 */
export const USER_ATTEMPTS = "attempts" as const;
export const USER_SITE_EVENTS = "site_events" as const;
