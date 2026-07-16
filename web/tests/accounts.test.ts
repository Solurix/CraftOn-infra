import { beforeEach, describe, expect, it } from "vitest";

import { forgetAccount, loadAccounts, rememberAccount } from "@/lib/auth/accounts";

beforeEach(() => localStorage.clear());

describe("remembered accounts", () => {
  it("starts empty", () => {
    expect(loadAccounts()).toEqual([]);
  });

  it("remembers, upserts by phone, and orders newest-first", () => {
    rememberAccount({ phone: "+81901", displayName: "A", role: "worker" }, 100);
    rememberAccount({ phone: "+81902", displayName: "B", role: "contractor" }, 200);
    // Re-login as the first account updates it and moves it to the front.
    rememberAccount({ phone: "+81901", displayName: "A renamed", role: "worker" }, 300);

    const list = loadAccounts();
    expect(list.map((a) => a.phone)).toEqual(["+81901", "+81902"]);
    expect(list).toHaveLength(2);
    expect(list[0].displayName).toBe("A renamed");
  });

  it("forgets an account", () => {
    rememberAccount({ phone: "+81901", displayName: "A", role: "worker" }, 100);
    rememberAccount({ phone: "+81902", displayName: "B", role: "contractor" }, 200);

    const after = forgetAccount("+81901");
    expect(after.map((a) => a.phone)).toEqual(["+81902"]);
    expect(loadAccounts().map((a) => a.phone)).toEqual(["+81902"]);
  });

  it("survives corrupt storage", () => {
    localStorage.setItem("crafton.accounts", "not json");
    expect(loadAccounts()).toEqual([]);
  });

  it("caps the remembered list at the most-recent few (PII hygiene)", () => {
    for (let i = 0; i < 12; i++) {
      rememberAccount({ phone: `+8190${i}`, displayName: `U${i}`, role: "worker" }, 100 + i);
    }
    const list = loadAccounts();
    expect(list).toHaveLength(8);
    expect(list[0].phone).toBe("+819011"); // newest first
    expect(list.map((a) => a.phone)).not.toContain("+81900"); // oldest evicted
  });
});
