"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { Landing } from "@/components/Landing";
import { ProfileSubmissionSummary } from "@/components/ProfileSubmissionSummary";
import { Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";

export default function Home() {
  const { me, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations("onboarding");

  useEffect(() => {
    if (loading || !me) return;
    const role = me.user.user_type;
    const onboarded =
      role === "admin" || me.has_worker_profile || me.has_contractor_profile;
    if (!onboarded) {
      router.replace("/onboarding");
      return;
    }
    if (me.user.status === "approved") {
      router.replace(role === "worker" ? "/jobs" : role === "contractor" ? "/my-jobs" : "/admin");
    }
  }, [loading, me, router]);

  // Logged-out visitors get the public landing page (what CRAFT-ON is, before
  // they register) rather than being bounced straight to /login.
  if (!loading && !me) {
    return <Landing />;
  }

  const pending =
    me && me.user.status !== "approved" && (me.has_worker_profile || me.has_contractor_profile);

  return (
    <AppShell>
      {pending && me ? (
        <div className="space-y-4">
          <div className="card">
            <p className="text-sm text-gray-700">{t("pendingReview")}</p>
          </div>
          <ProfileSubmissionSummary me={me} />
        </div>
      ) : (
        <Spinner />
      )}
    </AppShell>
  );
}
