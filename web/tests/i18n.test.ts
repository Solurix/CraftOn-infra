import { describe, expect, it } from "vitest";

import en from "../messages/en.json";
import ja from "../messages/ja.json";

type Json = Record<string, unknown>;

function flatten(obj: Json, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" ? flatten(v as Json, key) : [key];
  });
}

describe("i18n parity", () => {
  it("ja and en have identical key sets", () => {
    const jaKeys = new Set(flatten(ja as Json));
    const enKeys = new Set(flatten(en as Json));
    const missingInEn = [...jaKeys].filter((k) => !enKeys.has(k));
    const missingInJa = [...enKeys].filter((k) => !jaKeys.has(k));
    expect(missingInEn).toEqual([]);
    expect(missingInJa).toEqual([]);
  });
});
