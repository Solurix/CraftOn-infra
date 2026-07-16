import { describe, expect, it } from "vitest";

import type { Job } from "@/lib/api/models";
import { jobInsights } from "@/lib/insights";

const job = (status: Job["status"]): Job => ({ status }) as Job;

describe("insights", () => {
  it("counts jobs by status", () => {
    const out = jobInsights([
      job("open"),
      job("open"),
      job("filled"),
      job("closed"),
      job("canceled"),
    ]);
    expect(out).toEqual({ total: 5, open: 2, filled: 1, closed: 2 });
  });

  it("handles an empty list", () => {
    expect(jobInsights([])).toEqual({ total: 0, open: 0, filled: 0, closed: 0 });
  });
});
