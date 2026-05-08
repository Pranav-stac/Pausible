const LOCAL_UID_KEY = "pausible_local_uid";

let memoryUid: string | null = null;

/** Stable ID for this browser; survives refresh when localStorage works. */
export function getOrCreateLocalUid(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.localStorage.getItem(LOCAL_UID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(LOCAL_UID_KEY, id);
    }
    return id;
  } catch {
    memoryUid = memoryUid ?? crypto.randomUUID();
    return memoryUid;
  }
}
