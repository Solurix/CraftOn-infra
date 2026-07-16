import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/ui";
import messages from "../messages/ja.json";

describe("StatusBadge", () => {
  it("renders the localized (ja) status label", () => {
    render(
      <NextIntlClientProvider locale="ja" messages={messages}>
        <StatusBadge status="confirmed" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("確定")).toBeInTheDocument();
  });
});
