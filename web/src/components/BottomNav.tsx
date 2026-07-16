"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/auth/context";
import { isActivePath, NAV, type Role } from "@/lib/nav";

// Thumb-reachable tab bar shown only on small screens (the desktop pill nav in
// AppShell is hidden on mobile). Icons + short labels; the active tab is tinted.
export function BottomNav() {
  const { me } = useAuth();
  const nav = useTranslations("nav");
  const pathname = usePathname();
  const role = me?.user.user_type as Role | undefined;
  if (!role) return null;

  const items = NAV[role].filter((i) => i.bottom !== false);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur sm:hidden"
      aria-label={nav("primary")}
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium ${
                  active ? "text-brand" : "text-gray-500"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {item.icon}
                </span>
                <span className="truncate">{nav(item.key as never)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
