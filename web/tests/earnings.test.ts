import { describe, expect, it } from "vitest";

import type { Matching } from "@/lib/api/models";
import { monthlyEarnings } from "@/lib/earnings";

function m(p: Partial<Matching>): Matching {
  return {
    id: p.id ?? "m",
    job_id: "j",
    worker_id: "w",
    application_id: "a",
    status: "completed",
    contract_type: "subcontract",
    daily_wage: p.daily_wage ?? 18000,
    platform_fee: 0,
    fee_status: "unpaid",
    checked_in_at: null,
    completion_requested_at: null,
    completed_at: p.completed_at ?? null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    work_date: p.work_date,
  } as Matching;
}

describe("earnings", () => {
  it("aggregates by month, newest first", () => {
    const rows = monthlyEarnings([
      m({ work_date: "2026-06-02", daily_wage: 18000 }),
      m({ work_date: "2026-06-20", daily_wage: 20000 }),
      m({ work_date: "2026-05-10", daily_wage: 15000 }),
    ]);
    expect(rows).toEqual([
      { month: "2026-06", count: 2, total: 38000 },
      { month: "2026-05", count: 1, total: 15000 },
    ]);
  });

  it("falls back to completed_at when work_date is missing", () => {
    const rows = monthlyEarnings([m({ completed_at: "2026-04-15T09:00:00Z", daily_wage: 12000 })]);
    expect(rows).toEqual([{ month: "2026-04", count: 1, total: 12000 }]);
  });

  it("skips matchings with no date", () => {
    expect(monthlyEarnings([m({})])).toEqual([]);
  });
});
