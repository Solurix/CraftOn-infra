// Shared navigation model — one source of truth for the desktop pill nav
// (AppShell) and the mobile bottom tab bar (BottomNav). `key` is a `nav.*`
// i18n message key; `bottom: false` keeps an item out of the (space-limited)
// mobile bar while still showing it on desktop.
export type Role = "worker" | "contractor" | "admin";

export type NavItem = {
  href: string;
  key: string;
  icon: string;
  bottom?: boolean;
};

export const NAV: Record<Role, NavItem[]> = {
  worker: [
    { href: "/jobs", key: "jobs", icon: "🔍" },
    { href: "/saved", key: "saved", icon: "★", bottom: false },
    { href: "/applications", key: "myApplications", icon: "📋" },
    { href: "/matchings", key: "matchings", icon: "🤝" },
    { href: "/history", key: "history", icon: "💴" },
    { href: "/profile", key: "profile", icon: "👤" },
  ],
  contractor: [
    { href: "/post-job", key: "postJob", icon: "➕" },
    { href: "/my-jobs", key: "myJobs", icon: "🗂️" },
    { href: "/matchings", key: "matchings", icon: "🤝" },
    { href: "/profile", key: "profile", icon: "👤" },
  ],
  admin: [{ href: "/admin", key: "vetting", icon: "🛡️" }],
};

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
