// Lightweight cross-component signal so the header bell can refresh its unread
// badge the moment the inbox marks notifications read — the two components don't
// share state, and a full store/context is overkill for a single counter.
// (Real-time push is a later, GCP feature.)
export const NOTIFICATIONS_CHANGED = "crafton:notifications-changed";

export function emitNotificationsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
  }
}
