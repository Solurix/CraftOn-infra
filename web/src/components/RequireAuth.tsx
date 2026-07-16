"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth/context";
import { AppShell } from "./AppShell";
import { Spinner } from "./ui";

type Role = "worker" | "contractor" | "admin";

// Guards a page: redirects to /login when unauthenticated, and shows a pending
// notice for non-approved accounts (the API also enforces this server-side).
export function RequireAuth({
  role,
  requireApproved = true,
  children,
}: {
  role?: Role;
  requireApproved?: boolean;
  children: ReactNode;
}) {
  const { me, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations("onboarding");

  const roleMismatch = !!me && !!role && me.user.user_type !== role;
  // Signed in but never completed onboarding (no profile). Admins have no
  // worker/contractor profile by design, so they're excluded.
  const notOnboarded =
    !!me &&
    me.user.user_type !== "admin" &&
    !me.has_worker_profile &&
    !me.has_contractor_profile;

  useEffect(() => {
    if (loading) return;
    if (!me) router.replace("/login");
    // Role changed under us (e.g. switched accounts in another tab) → route home,
    // which redirects to the new role's landing instead of stranding on a 403.
    else if (roleMismatch) router.replace("/");
    // Send un-onboarded users to finish onboarding rather than show a
    // "pending review" notice for a profile that doesn't exist yet.
    else if (notOnboarded) router.replace("/onboarding");
  }, [loading, me, roleMismatch, notOnboarded, router]);

  if (loading) {
    return (
      <AppShell>
        <Spinner />
      </AppShell>
    );
  }
  if (!me || roleMismatch || notOnboarded) {
    return (
      <AppShell>
        <Spinner />
      </AppShell>
    );
  }

  if (requireApproved && me.user.status !== "approved") {
    return (
      <AppShell>
        <div className="card">
          <p className="text-sm text-gray-700">{t("pendingReview")}</p>
        </div>
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
