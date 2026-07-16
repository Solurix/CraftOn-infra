import { describe, expect, it } from "vitest";

import { makeFakeToken } from "@/lib/auth/fakeToken";

function decode(token: string): { uid: string; phone_number: string } {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

describe("makeFakeToken", () => {
  it("encodes the phone number as unpadded base64url JSON (API-compatible)", () => {
    const token = makeFakeToken("+819012345678");
    expect(token).not.toContain("=");
    const payload = decode(token);
    expect(payload.phone_number).toBe("+819012345678");
    expect(payload.uid).toBe("fake-+819012345678");
  });
});
