// Money is integer JPY; times display in Asia/Tokyo (docs/CLAUDE.md).
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function formatDate(iso: string): string {
  // Date-only values (work_date) render as-is; datetimes shown in Tokyo.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatTime(t: string): string {
  return t.slice(0, 5); // HH:MM
}

// Render a shift's time range. Night shifts store end <= start meaning "ends
// the next day"; display them in the 24+ convention common on Japanese sites
// (21:00–29:00 = finishes 5:00 the next morning).
export function formatTimeRange(start: string, end: string): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (e > s) return `${s}–${e}`;
  const endHour = Number(end.slice(0, 2)) + 24;
  return `${s}–${endHour}:${end.slice(3, 5)}`;
}
