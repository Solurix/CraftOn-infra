"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

import { LanguageSwitcher } from "./LanguageSwitcher";

// Public marketing page shown at "/" to logged-out visitors so they understand
// what CRAFT-ON is before signing up. All copy is keyed (landing.*); links go to
// /login (?mode=signup for the "get started"/"create account" calls to action).

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="card card-hover h-full">
      <div
        className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-xl text-brand"
        aria-hidden
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="card flex gap-4">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
        aria-hidden
      >
        {n}
      </span>
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{body}</p>
      </div>
    </li>
  );
}

export function Landing() {
  const t = useTranslations("landing");
  const app = useTranslations("app");

  const features = [
    { icon: "⚡", title: t("features.spot.title"), body: t("features.spot.body") },
    { icon: "✅", title: t("features.noshow.title"), body: t("features.noshow.body") },
    { icon: "⭐", title: t("features.trust.title"), body: t("features.trust.body") },
    { icon: "🌏", title: t("features.foreign.title"), body: t("features.foreign.body") },
    { icon: "🔒", title: t("features.safe.title"), body: t("features.safe.body") },
    { icon: "🆓", title: t("features.free.title"), body: t("features.free.body") },
  ];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-brand">
              {app("name")}
            </span>
            <span className="text-[10px] text-gray-400">{app("tagline")}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">
              {t("nav.login")}
            </Link>
            <Link href="/login?mode=signup" className="btn-primary">
              {t("nav.signup")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        {/* Hero */}
        <section className="py-14 text-center sm:py-20">
          <span className="chip mx-auto inline-flex border-brand/30 bg-brand-soft text-brand">
            🏗️ {t("hero.badge")}
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login?mode=signup"
              className="btn-primary w-full px-6 py-3 text-base sm:w-auto"
            >
              {t("hero.ctaPrimary")}
            </Link>
            <Link
              href="/login"
              className="btn-secondary w-full px-6 py-3 text-base sm:w-auto"
            >
              {t("hero.ctaSecondary")}
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">{t("hero.freeNote")}</p>
        </section>

        {/* Audience */}
        <section className="py-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {t("audience.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
              {t("audience.subtitle")}
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="card card-hover flex flex-col">
              <span className="text-xs font-medium uppercase tracking-wide text-brand">
                {t("audience.worker.tag")}
              </span>
              <h3 className="mt-1 text-xl font-bold text-gray-900">
                {t("audience.worker.title")}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                {t("audience.worker.body")}
              </p>
              <Link
                href="/login?mode=signup"
                className="btn-primary mt-4 self-start"
              >
                {t("audience.worker.cta")}
              </Link>
            </div>
            <div className="card card-hover flex flex-col">
              <span className="text-xs font-medium uppercase tracking-wide text-brand">
                {t("audience.contractor.tag")}
              </span>
              <h3 className="mt-1 text-xl font-bold text-gray-900">
                {t("audience.contractor.title")}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                {t("audience.contractor.body")}
              </p>
              <Link
                href="/login?mode=signup"
                className="btn-secondary mt-4 self-start"
              >
                {t("audience.contractor.cta")}
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-10">
          <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {t("how.title")}
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            <Step n={1} title={t("how.step1.title")} body={t("how.step1.body")} />
            <Step n={2} title={t("how.step2.title")} body={t("how.step2.body")} />
            <Step n={3} title={t("how.step3.title")} body={t("how.step3.body")} />
            <Step n={4} title={t("how.step4.title")} body={t("how.step4.body")} />
          </ol>
        </section>

        {/* Features */}
        <section className="py-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {t("features.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
              {t("features.subtitle")}
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} body={f.body} />
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12">
          <div className="rounded-2xl bg-brand px-6 py-12 text-center text-white shadow-sm">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/90 sm:text-base">
              {t("cta.body")}
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login?mode=signup"
                className="btn w-full bg-white px-6 py-3 text-base font-semibold text-brand shadow-sm hover:bg-gray-100 sm:w-auto"
              >
                {t("cta.primary")}
              </Link>
              <Link
                href="/login"
                className="btn w-full border border-white/70 px-6 py-3 text-base font-semibold text-white hover:bg-white/10 sm:w-auto"
              >
                {t("cta.secondary")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/70 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 px-4 text-center">
          <span className="text-sm font-bold text-brand">{app("name")}</span>
          <span className="text-xs text-gray-500">{t("footer.area")}</span>
          <span className="text-xs text-gray-400">{t("footer.rights")}</span>
        </div>
      </footer>
    </div>
  );
}
