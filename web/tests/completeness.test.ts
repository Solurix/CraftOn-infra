import { describe, expect, it } from "vitest";

import type { WorkerProfile } from "@/lib/api/models";
import { workerCompleteness } from "@/lib/completeness";

function worker(p: Partial<WorkerProfile>): WorkerProfile {
  return {
    full_name: null,
    trades: [],
    years_experience: 0,
    prefecture: null,
    skills: [],
    qualifications: [],
    tools: [],
    bio: null,
    work_history: [],
    ...p,
  } as WorkerProfile;
}

describe("completeness", () => {
  it("reports 0% for an empty profile and lists all missing fields", () => {
    const c = workerCompleteness(worker({}));
    expect(c.pct).toBe(0);
    expect(c.missing).toContain("trades");
    expect(c.missing).toContain("bio");
  });

  it("reports 100% when every tracked field is set", () => {
    const c = workerCompleteness(
      worker({
        full_name: "山田 太郎",
        trades: ["大工"],
        years_experience: 5,
        prefecture: "東京都",
        skills: ["内装"],
        qualifications: ["玉掛け"],
        tools: ["インパクト"],
        bio: "10年の経験",
        work_history: [{ company: "A", trade: "大工", years: 5, description: "" }],
      }),
    );
    expect(c.pct).toBe(100);
    expect(c.missing).toEqual([]);
  });

  it("computes partial completion", () => {
    const c = workerCompleteness(worker({ trades: ["大工"], prefecture: "東京都" }));
    expect(c.pct).toBeGreaterThan(0);
    expect(c.pct).toBeLessThan(100);
  });
});
