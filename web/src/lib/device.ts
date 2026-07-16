// A stable per-device id (persisted in localStorage) + a human label derived
// from the user agent. Sent as X-Device-Id / X-Device-Name so the API can list
// and revoke devices.
const KEY = "crafton.device";
const NAME_KEY = "crafton.device.name";

export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}${Date.now()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

// Forget the current device id so the next request enrolls a fresh device.
// Used after a device_revoked response: a later legitimate login then gets a new
// (non-revoked) device record, while the revoked one stays revoked.
export function rotateDeviceId(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY);
    localStorage.removeItem(NAME_KEY);
  }
}

// The device label is computed once from the user agent and then PINNED in
// localStorage. Switching a mobile browser to "Desktop site" (or DevTools device
// emulation) changes the UA mid-session; without pinning, the label we send
// would change too, which the API can read as a different device and end the
// session. Pinning keeps this device's identity stable across such toggles.
export function getDeviceName(): string | null {
  if (typeof navigator === "undefined") return null;
  if (typeof localStorage !== "undefined") {
    const pinned = localStorage.getItem(NAME_KEY);
    if (pinned) return pinned;
  }
  const ua = navigator.userAgent;
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /OPR|Opera/.test(ua)
      ? "Opera"
      : /Chrome/.test(ua)
        ? "Chrome"
        : /Firefox/.test(ua)
          ? "Firefox"
          : /Safari/.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const name = os ? `${browser} · ${os}` : browser;
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(NAME_KEY, name);
  } catch {
    /* best-effort */
  }
  return name;
}
