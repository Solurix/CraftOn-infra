// API transport layer. A thin wrapper over fetch that injects the bearer token
// and surfaces the backend's `{error:{code,message}}` envelope as ApiError.
import { getDeviceId, getDeviceName, rotateDeviceId } from "../device";

// Dispatched on a 401 to an authenticated request so AuthProvider can drop the
// session immediately (revoked device / invalid token).
export const AUTH_EXPIRED_EVENT = "crafton:auth-expired";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type Options = { method?: string; body?: unknown; token?: string | null; query?: Record<string, string | undefined> };

export async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const url = new URL(`${API_BASE}/api/v1${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v != null && v !== "") url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  // Tell the API which language the UI is showing so error messages come back
  // localized (the browser's own Accept-Language may differ from NEXT_LOCALE).
  const uiLocale =
    typeof document !== "undefined"
      ? /(?:^|;\s*)NEXT_LOCALE=(ja|en)/.exec(document.cookie)?.[1]
      : undefined;
  if (uiLocale) headers["Accept-Language"] = uiLocale;
  // Identify the device so the API can list/revoke it.
  const deviceId = getDeviceId();
  if (deviceId) {
    headers["X-Device-Id"] = deviceId;
    const deviceName = getDeviceName();
    if (deviceName) headers["X-Device-Name"] = deviceName;
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, "network_error", "network");
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } }).error;
    // This device was revoked → drop auth state app-wide and rotate the device id
    // so a later legitimate login enrolls a fresh (non-revoked) device. Scoped to
    // this exact code so ordinary 401s (e.g. needs-signup on /me) don't log out.
    if (
      res.status === 401 &&
      err?.code === "device_revoked" &&
      typeof window !== "undefined"
    ) {
      rotateDeviceId();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(res.status, err?.code ?? "error", err?.message ?? "error");
  }
  return data as T;
}
