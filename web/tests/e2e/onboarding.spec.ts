import { expect, test } from "@playwright/test";

// Browser E2E smoke: a real signup + onboarding flows through the web app to the
// running API and back (auth → typed client → onboarding → pending state). The
// full admin-gated cycle is covered deterministically by the API-level
// test_full_cycle; this proves the PWA wiring works in a browser.
//
// Requires a running crafton-api (NEXT_PUBLIC_API_BASE_URL) and fake auth mode.

test.use({ locale: "en-US" });

test("contractor can sign up and onboard", async ({ page, context }) => {
  // Render the UI in English for stable selectors.
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", url: "http://localhost:3000" },
  ]);

  const stamp = Date.now().toString().slice(-9);
  // The phone field is now a country picker (+81 default) + national number.
  const phoneNational = `90${stamp}`;

  await page.goto("/login");
  // Switch to sign-up, choose the contractor role.
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByText("Choose your role")).toBeVisible();
  await page.getByRole("button", { name: "Sign up as a contractor" }).click();

  // Registration details, then verify the phone by SMS (only step needing OTP).
  // No display name at signup — it defaults to the company name from onboarding.
  await page.getByLabel("Username").fill(`e2e_${stamp}`);
  await page.getByLabel("Email").fill(`e2e_${stamp}@example.com`);
  await page.getByLabel("Phone number").fill(phoneNational);
  await page.getByLabel("Password").fill("test-password-123");
  await page.getByRole("button", { name: "Send verification code" }).click();
  await page.getByPlaceholder("123456").fill("123456");
  await page.getByRole("button", { name: "Create account" }).click();

  // Contractor onboarding form.
  await expect(page.getByText("Contractor profile")).toBeVisible();
  const inputs = page.getByRole("textbox");
  await inputs.nth(0).fill("E2E建設"); // company name
  await inputs.nth(1).fill("Tanaka"); // contact person
  // prefecture is prefilled with Tokyo
  await page.getByRole("button", { name: "Submit" }).click();

  // Onboarded but not yet approved → pending-review state.
  await expect(
    page.getByText("Under review. Please wait for approval."),
  ).toBeVisible();
});
