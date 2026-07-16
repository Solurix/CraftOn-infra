import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { Landing } from "@/components/Landing";
import messages from "../messages/en.json";

// LanguageSwitcher (rendered inside Landing's header) pulls useRouter from the
// App Router context, which isn't mounted in jsdom — stub it.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

function renderLanding() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Landing />
    </NextIntlClientProvider>,
  );
}

describe("Landing", () => {
  it("shows the hero headline and value proposition", () => {
    renderLanding();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: messages.landing.hero.title,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.landing.hero.freeNote)).toBeInTheDocument();
  });

  it("routes the primary calls to action to sign up", () => {
    renderLanding();
    const signupLinks = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "/login?mode=signup");
    // Header, hero, both audience cards, and the final CTA all link to sign up.
    expect(signupLinks.length).toBeGreaterThanOrEqual(4);
    // And a plain log-in link exists for returning users.
    expect(
      screen.getAllByRole("link").some((a) => a.getAttribute("href") === "/login"),
    ).toBe(true);
  });

  it("explains who it's for (workers and contractors)", () => {
    renderLanding();
    expect(screen.getByText(messages.landing.audience.worker.tag)).toBeInTheDocument();
    expect(
      screen.getByText(messages.landing.audience.contractor.tag),
    ).toBeInTheDocument();
  });
});
