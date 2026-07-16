import { expect, test } from "@playwright/test";

// Verifies "remember logged-in accounts on a device": after onboarding, the
// account is remembered; after logout it appears under "Recent accounts" and
// tapping it pre-fills the identifier so re-login only needs the password.

test.use({ locale: "en-US" });

test("remembers the account and re-logs-in with the password", async ({ page, context }) => {
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", url: "http://localhost:3000" },
  ]);
  const stamp = Date.now().toString().slice(-9);
  // The phone field is now a country picker (+81 default) + national number.
  const phoneNational = `90${stamp}`;
  // No display name is asked at signup anymore; after onboarding the account's
  // public name defaults to the company name.
  const name = "Remembered Co";
  const password = "test-password-123";

  // Sign up + onboard a contractor.
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByText("Choose your role")).toBeVisible();
  await page.getByRole("button", { name: "Sign up as a contractor" }).click();
  await page.getByLabel("Username").fill(`rem_${stamp}`);
  await page.getByLabel("Email").fill(`rem_${stamp}@example.com`);
  await page.getByLabel("Phone number").fill(phoneNational);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Send verification code" }).click();
  await page.getByPlaceholder("123456").fill("123456");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Contractor profile")).toBeVisible();
  const inputs = page.getByRole("textbox");
  await inputs.nth(0).fill(name);
  await inputs.nth(1).fill("Tanaka");
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Under review. Please wait for approval.")).toBeVisible();

  // Log out via the account menu (items are ARIA menuitems).
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();

  // The login page now offers the remembered account — tapping pre-fills the id.
  await expect(page.getByText("Recent accounts")).toBeVisible();
  // Anchor on the name start so the "Remove <name>" button isn't also matched.
  const recent = page.getByRole("button", { name: new RegExp("^" + name) });
  await expect(recent).toBeVisible();
  await recent.click();

  // Identifier is pre-filled; enter the password to log back in.
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText("Under review. Please wait for approval.")).toBeVisible();
});

// Regression: adding a second account from the account menu while still logged
// in used to silently return the CURRENT account (the stale session token won
// over the fresh OTP token in completeSignup), so no new account was created
// and the user just bounced back to the original session.
test("adds a second account from the account menu while logged in", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "NEXT_LOCALE", value: "en", url: "http://localhost:3000" },
  ]);
  const stamp = Date.now().toString().slice(-9);
  const password = "test-password-123";

  const signupContractor = async (slug: string, phoneNational: string, company: string) => {
    await page.getByRole("button", { name: "Sign up as a contractor" }).click();
    await page.getByLabel("Username").fill(slug);
    await page.getByLabel("Email").fill(`${slug}@example.com`);
    await page.getByLabel("Phone number").fill(phoneNational);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Send verification code" }).click();
    await page.getByPlaceholder("123456").fill("123456");
    await page.getByRole("button", { name: "Create account" }).click();
    // The onboarding form for the NEW account must appear (the regression left
    // you on the previous account's pages instead).
    await expect(page.getByText("Contractor profile")).toBeVisible();
    const inputs = page.getByRole("textbox");
    await inputs.nth(0).fill(company);
    await inputs.nth(1).fill("Tanaka");
    await page.getByRole("button", { name: "Submit" }).click();
    await expect(
      page.getByText("Under review. Please wait for approval."),
    ).toBeVisible();
  };

  // Account A.
  await page.goto("/login?mode=signup");
  await signupContractor(`add_a_${stamp}`, `70${stamp.slice(1)}`, "First Co");

  // Add account B from the account menu without logging out.
  await page.getByRole("button", { name: "First Co" }).click();
  await page.getByRole("menuitem", { name: "Add account" }).click();
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await signupContractor(`add_b_${stamp}`, `80${stamp.slice(1)}`, "Second Co");

  // The active account is now B…
  await expect(page.getByRole("button", { name: "Second Co" })).toBeVisible();
  // …and A is offered in the switcher.
  await page.getByRole("button", { name: "Second Co" }).click();
  await expect(page.getByRole("menuitem", { name: /First Co/ })).toBeVisible();
});
