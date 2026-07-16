"use client";

import { useLocale } from "next-intl";

import { AppShell } from "@/components/AppShell";
import { BackLink } from "@/components/ui";

export type LegalSection = { heading: string; body: string[] };
export type LegalContent = {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
};

// Renders a legal document (Terms / Privacy). Content is provided per-locale by
// the page; legal copy lives inline (not in the i18n key catalog) because it's a
// document, not UI chrome. The wording is provisional pending legal sign-off.
export function LegalPage({ ja, en }: { ja: LegalContent; en: LegalContent }) {
  const locale = useLocale();
  const c = locale === "en" ? en : ja;
  return (
    <AppShell>
      <article className="prose-sm mx-auto max-w-2xl space-y-4">
        <BackLink href="/" />
        <header>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{c.title}</h1>
          <p className="mt-1 text-xs text-gray-400">{c.updated}</p>
        </header>
        {c.intro && <p className="text-sm text-gray-700">{c.intro}</p>}
        {c.sections.map((s, i) => (
          <section key={i} className="space-y-1">
            <h2 className="font-semibold text-gray-900">
              {i + 1}. {s.heading}
            </h2>
            {s.body.map((para, j) => (
              <p key={j} className="text-sm leading-relaxed text-gray-700">
                {para}
              </p>
            ))}
          </section>
        ))}
      </article>
    </AppShell>
  );
}
