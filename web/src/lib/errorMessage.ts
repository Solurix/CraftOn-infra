import { ApiError } from "@/lib/api/client";

// Turn a caught error into user-facing text. The API client throws
// ApiError(code "network_error", message "network") when fetch itself fails
// (offline, DNS, or a CORS-less 5xx) — callers pass the localized fallback.
export function humanizeError(err: unknown, networkMessage: string): string {
  if (err instanceof ApiError && err.code === "network_error") return networkMessage;
  return err instanceof Error ? err.message : "error";
}
