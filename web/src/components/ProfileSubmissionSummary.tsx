"use client";

import { useLocale, useTranslations } from "next-intl";

import { ProfileRow } from "@/components/profile";
import type { Me } from "@/lib/api/models";
import { prefectureLabel } from "@/lib/prefectures";

// Read-only recap of what a user submitted, shown while their account is under
// review so they can confirm their details (docs/04 onboarding spec).
export function ProfileSubmissionSummary({ me }: { me: Me }) {
  const ob = useTranslations("onboarding");
  const p = useTranslations("profile");
  const auth = useTranslations("auth");
  const locale = useLocale();
  const list = (a: string[] | null | undefined) =>
    a && a.length > 0 ? a.join(", ") : "—";

  const wp = me.worker_profile;
  const cp = me.contractor_profile;

  return (
    <div className="card space-y-2">
      <h2 className="font-semibold">{ob("yourSubmission")}</h2>
      <ProfileRow label={auth("displayName")} value={me.user.display_name} />

      {wp && (
        <>
          {wp.full_name && <ProfileRow label={ob("fullName")} value={wp.full_name} />}
          {wp.name_kana && <ProfileRow label={ob("nameKana")} value={wp.name_kana} />}
          {wp.email && <ProfileRow label={ob("email")} value={wp.email} />}
          <ProfileRow label={ob("nationality")} value={wp.nationality} />
          <ProfileRow label={ob("workerClass")} value={ob(wp.worker_class)} />
          <ProfileRow label={p("trades")} value={list(wp.trades)} />
          {(wp.prefecture || wp.area) && (
            <ProfileRow
              label={p("region")}
              value={[prefectureLabel(wp.prefecture, locale), wp.area].filter(Boolean).join(" / ")}
            />
          )}
          {wp.current_employer && (
            <ProfileRow label={p("employer")} value={wp.current_employer} />
          )}
          {wp.qualifications?.length > 0 && (
            <ProfileRow label={p("qualifications")} value={list(wp.qualifications)} />
          )}
          {wp.skills?.length > 0 && (
            <ProfileRow label={p("skills")} value={list(wp.skills)} />
          )}
          {wp.work_history?.length > 0 && (
            <div>
              <p className="field-label">{p("career")}</p>
              <ul className="text-sm text-gray-700">
                {wp.work_history.map((h, i) => (
                  <li key={i}>
                    {p("careerEntry", {
                      company: h.company,
                      trade: h.trade || "—",
                      years: h.years,
                    })}
                    {h.description && (
                      <p className="text-xs text-gray-500">{h.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {wp.bio && (
            <div>
              <p className="field-label">{p("about")}</p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{wp.bio}</p>
            </div>
          )}
        </>
      )}

      {cp && (
        <>
          <ProfileRow label={ob("companyName")} value={cp.company_name} />
          <ProfileRow label={ob("contactPerson")} value={cp.contact_person} />
          <ProfileRow label={ob("prefecture")} value={prefectureLabel(cp.prefecture, locale)} />
          {cp.address && <ProfileRow label={ob("address")} value={cp.address} />}
          {cp.bio && (
            <div>
              <p className="field-label">{p("about")}</p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{cp.bio}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
