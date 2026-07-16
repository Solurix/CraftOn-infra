import { describe, expect, it } from "vitest";

import { isActivePath, NAV } from "@/lib/nav";

describe("nav", () => {
  it("matches exact and nested paths", () => {
    expect(isActivePath("/jobs", "/jobs")).toBe(true);
    expect(isActivePath("/jobs/abc", "/jobs")).toBe(true);
    expect(isActivePath("/my-jobs", "/jobs")).toBe(false);
    expect(isActivePath("/", "/jobs")).toBe(false);
  });

  it("defines a non-empty nav for each role", () => {
    for (const role of ["worker", "contractor", "admin"] as const) {
      expect(NAV[role].length).toBeGreaterThan(0);
    }
  });

  it("keeps at least one bottom-bar item per role", () => {
    for (const role of ["worker", "contractor", "admin"] as const) {
      expect(NAV[role].some((i) => i.bottom !== false)).toBe(true);
    }
  });
});
