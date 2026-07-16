import { afterEach, describe, expect, it } from "vitest";

import { readJSON, writeJSON } from "@/lib/storage";

describe("storage", () => {
  afterEach(() => localStorage.clear());

  it("returns the fallback when nothing is stored", () => {
    expect(readJSON("crafton:test", { a: 1 })).toEqual({ a: 1 });
    expect(readJSON("crafton:test", [])).toEqual([]);
  });

  it("round-trips JSON values", () => {
    writeJSON("crafton:test", { name: "ねじ", n: 3 });
    expect(readJSON("crafton:test", null)).toEqual({ name: "ねじ", n: 3 });
  });

  it("falls back gracefully on corrupt JSON", () => {
    localStorage.setItem("crafton:test", "{not json");
    expect(readJSON("crafton:test", "default")).toBe("default");
  });
});
