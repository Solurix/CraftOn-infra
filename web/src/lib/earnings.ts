// Group completed matchings into monthly earnings for the worker's history /
// earnings dashboard. Pure + testable; money stays integer JPY.
import type { Matching } from "./api/models";

export type MonthEarnings = { month: string; count: number; total: number };

export function monthlyEarnings(matchings: Matching[]): MonthEarnings[] {
  const map = new Map<string, { count: number; total: number }>();
  for (const m of matchings) {
    const day = m.work_date ?? (m.completed_at ? m.completed_at.slice(0, 10) : null);
    if (!day) continue;
    const month = day.slice(0, 7); // YYYY-MM
    const cur = map.get(month) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += m.daily_wage;
    map.set(month, cur);
  }
  return [...map.entries()]
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => b.month.localeCompare(a.month)); // newest first
}
