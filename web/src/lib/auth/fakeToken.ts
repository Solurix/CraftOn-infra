// Fake bearer token for dev/CI/E2E. Mirrors the backend's make_fake_token:
// base64url(JSON{uid, phone_number}) with no padding. No GCP needed.
export function makeFakeToken(phoneNumber: string): string {
  const payload = JSON.stringify({
    uid: `fake-${phoneNumber}`,
    phone_number: phoneNumber,
  });
  const b64 =
    typeof btoa === "function"
      ? btoa(payload)
      : Buffer.from(payload, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
