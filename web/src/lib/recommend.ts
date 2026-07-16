// Lightweight, deterministic job recommendation. Phase-1 ranking is rules-based
// and runs client-side over already-fetched open jobs — no new endpoint, no ML.
// (Server-side / Gemini ranking is a later phase; see BLOCKERS.md §1.4.)
import type { Job, WorkerProfile } from "./api/models";

const TRADE_MATCH = 50;
const PREFECTURE_MATCH = 30;
const WAGE_WEIGHT_CAP = 30;

export function scoreJob(job: Job, profile: WorkerProfile): number {
  let score = 0;
  if (profile.trades?.some((tr) => job.trades.includes(tr))) score += TRADE_MATCH;
  if (profile.prefecture && job.prefecture === profile.prefecture) {
    score += PREFECTURE_MATCH;
  }
  // Modest wage influence so a great-paying nearby job edges ahead of ties.
  score += Math.min(job.daily_wage / 1000, WAGE_WEIGHT_CAP);
  return score;
}

// Top open jobs that genuinely match the worker's trade (we only recommend when
// there's a real trade signal, so the strip never shows noise). Returns [] when
// there's no profile or nothing relevant.
export function recommendJobs(
  jobs: Job[],
  profile: WorkerProfile | null | undefined,
  limit = 3,
): Job[] {
  if (!profile) return [];
  return jobs
    .filter((j) => j.status === "open")
    .map((j) => ({ j, score: scoreJob(j, profile) }))
    .filter((x) => x.score >= TRADE_MATCH) // require at least a trade match
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.j);
}
