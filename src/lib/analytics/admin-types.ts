export type AdminSiteEventRow = {
  id: string;
  kind: string;
  uid: string;
  sessionId: string;
  path: string;
  label: string | null;
  createdAt: string;
  meta: Record<string, unknown> | null;
};

export type AdminAnalyticsResponse = {
  sampled: number;
  byKind: Record<string, number>;
  uniqueUids7d: number;
  uniqueUids30d: number;
  uniqueSessions7d: number;
  uniqueSessions30d: number;
  daily: { day: string; uniqueUids: number; uniqueSessions: number; events: number }[];
  topUsers: { uid: string; eventCount: number; lastSeen: string; byKind: Record<string, number> }[];
  recent: AdminSiteEventRow[];
  /** Server Admin SDK rejected Firestore; response is intentionally empty-ish. */
  degraded?: boolean;
  degradedMessage?: string;
};
