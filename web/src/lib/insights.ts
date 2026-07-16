// Lightweight hiring insights for a contractor's own postings — computed from
// the jobs list already on screen (no extra requests). Deeper metrics
// (applications-per-post, time-to-fill) need new endpoints; see BLOCKERS.md §2.8.
import type { Job } from "./api/models";

export type JobInsights = {
  total: number;
  open: number;
  filled: number;
  closed: number;
};

export function jobInsights(jobs: Job[]): JobInsights {
  const out: JobInsights = { total: jobs.length, open: 0, filled: 0, closed: 0 };
  for (const j of jobs) {
    if (j.status === "open") out.open += 1;
    else if (j.status === "filled") out.filled += 1;
    else out.closed += 1; // closed / canceled
  }
  return out;
}
