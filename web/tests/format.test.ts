import { describe, expect, it } from "vitest";

import { formatTime, formatYen } from "@/lib/format";

describe("format", () => {
  it("formats integer JPY with separators", () => {
    expect(formatYen(18000)).toBe("¥18,000");
    expect(formatYen(3000)).toBe("¥3,000");
  });

  it("trims seconds from a time string", () => {
    expect(formatTime("08:00:00")).toBe("08:00");
  });
});
