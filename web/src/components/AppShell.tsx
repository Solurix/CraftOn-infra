"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth/context";
import { isActivePath, NAV, type Role } from "@/lib/nav";
import { AccountMenu } from "./AccountMenu";
import { BottomNav } from "./BottomNav";
import { InstallPrompt } from "./InstallPrompt";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import { OfflineBanner } from "./OfflineBanner";
import { ThemeToggle } from "./ThemeToggle";

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand"
          : "inline-flex items-center gap-1 rounded-full px-3 py-1 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
      }
    >
      <span aria-hidden>{icon}</span>
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const nav = useTranslations("nav");
  const app = useTranslations("app");
  const common = useTranslations("common");
  const role = me?.user.user_type as Role | undefined;

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <a href="#main-content" className="skip-link">
        {common("skipToContent")}
      </a>
      <header className="sticky top-0 z-20 -mx-4 mb-1 flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand text-sm font-black text-white"
            aria-hidden
          >
            C
          </span>
          <span className="flex flex-col leading-tight">
            <span className="whitespace-nowrap text-base font-bold tracking-tight text-gray-900">
              {app("name")}
            </span>
            <span className="hidden text-[10px] text-gray-400 sm:block">
              {app("tagline")}
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          {me && <NotificationBell />}
          {me && <AccountMenu />}
        </div>
      </header>

      {/* Desktop/tablet pill nav; mobile uses the bottom tab bar instead. */}
      {role && (
        <nav
          className="mb-5 hidden flex-wrap gap-2 pt-3 text-sm sm:flex"
          aria-label={nav("primary")}
        >
          {NAV[role].map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={nav(item.key as never)}
            />
          ))}
        </nav>
      )}

      <main id="main-content" className="pt-2">
        <OfflineBanner />
        {me && <InstallPrompt />}
        {children}
      </main>

      {me && <BottomNav />}
    </div>
  );
}
