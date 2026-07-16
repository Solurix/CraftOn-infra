import { describe, expect, it } from "vitest";

import type { Job } from "@/lib/api/models";
import {
  diffJobForm,
  jobToForm,
  toApiEndTime,
  type JobForm,
} from "@/app/post-job/jobForm";

function job(p: Partial<Job> = {}): Job {
  return {
    id: "j1",
    contractor_id: "c1",
    trades: ["大工", "custom trade"],
    work_date: "2026-07-20",
    start_time: "08:00:00",
    end_time: "17:00:00",
    prefecture: "Tokyo",
    area: null,
    address: null,
    daily_wage: 18000,
    headcount: 2,
    notes: null,
    status: "open",
    created_at: "2026-07-01T00:00:00Z",
    photo_doc_ids: [],
    ...p,
  } as Job;
}

const CATALOG = ["大工"];

describe("jobToForm", () => {
  it("blanks the date for duplication but keeps it in edit mode", () => {
    expect(jobToForm(job(), CATALOG).work_date).toBe("");
    expect(jobToForm(job(), CATALOG, true).work_date).toBe("2026-07-20");
  });

  it("splits trades into catalog vs custom", () => {
    const f = jobToForm(job(), CATALOG, true);
    expect(f.trades).toEqual(["大工"]);
    expect(f.trades_other).toEqual(["custom trade"]);
  });

  it("surfaces an overnight end time on the 36-hour clock", () => {
    const f = jobToForm(job({ start_time: "21:00:00", end_time: "05:00:00" }), CATALOG);
    expect(f.end_time).toBe("29:00");
  });
});

describe("toApiEndTime", () => {
  it("wraps 24+ picker times back to the real clock", () => {
    expect(toApiEndTime("29:30")).toBe("05:30");
    expect(toApiEndTime("17:00")).toBe("17:00");
  });
});

describe("diffJobForm", () => {
  const original: JobForm = jobToForm(job(), CATALOG, true);

  it("returns an empty diff when nothing changed", () => {
    expect(diffJobForm({ ...original }, original)).toEqual({});
  });

  it("sends only the changed fields (unchanged terms must not trip the server lock)", () => {
    expect(diffJobForm({ ...original, notes: "bring tools" }, original)).toEqual({
      notes: "bring tools",
    });
  });

  it("normalizes numeric form inputs before comparing", () => {
    // Inputs hold strings; "18000" is not a wage change.
    expect(diffJobForm({ ...original, daily_wage: "18000", headcount: "2" }, original)).toEqual({});
    expect(diffJobForm({ ...original, headcount: "3" }, original)).toEqual({ headcount: 3 });
  });

  it("converts times to API shape, wrapping 24+ end times", () => {
    expect(diffJobForm({ ...original, start_time: "09:00", end_time: "29:00" }, original)).toEqual({
      start_time: "09:00:00",
      end_time: "05:00:00",
    });
  });

  it("combines catalog and custom trades into one changed list", () => {
    const diff = diffJobForm({ ...original, trades_other: ["custom trade", "足場"] }, original);
    expect(diff).toEqual({ trades: ["大工", "custom trade", "足場"] });
  });

  it("sends null for cleared optional text fields", () => {
    const withArea = { ...original, area: "Shibuya" };
    expect(diffJobForm({ ...withArea, area: "" }, withArea)).toEqual({ area: null });
  });
});
