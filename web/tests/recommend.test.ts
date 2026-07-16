import { describe, expect, it } from "vitest";

import type { Job, WorkerProfile } from "@/lib/api/models";
import { recommendJobs, scoreJob } from "@/lib/recommend";

function job(p: Partial<Job>): Job {
  return {
    id: p.id ?? "j",
    contractor_id: "c",
    trades: p.trades ?? ["大工"],
    work_date: "2026-07-01",
    start_time: "08:00:00",
    end_time: "17:00:00",
    prefecture: p.prefecture ?? "東京都",
    area: null,
    address: null,
    daily_wage: p.daily_wage ?? 18000,
    headcount: 1,
    notes: null,
    status: p.status ?? "open",
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  } as Job;
}

const profile = {
  trades: ["大工"],
  prefecture: "東京都",
} as WorkerProfile;

describe("recommend", () => {
  it("scores trade + prefecture matches highest", () => {
    const match = scoreJob(job({ trades: ["大工"], prefecture: "東京都" }), profile);
    const other = scoreJob(job({ trades: ["電気"], prefecture: "大阪府" }), profile);
    expect(match).toBeGreaterThan(other);
  });

  it("only recommends trade-matching open jobs", () => {
    const jobs = [
      job({ id: "a", trades: ["大工"] }),
      job({ id: "b", trades: ["電気"] }),
      job({ id: "c", trades: ["大工"], status: "closed" }),
    ];
    const recs = recommendJobs(jobs, profile);
    expect(recs.map((j) => j.id)).toEqual(["a"]);
  });

  it("returns nothing without a profile", () => {
    expect(recommendJobs([job({})], null)).toEqual([]);
  });
});
