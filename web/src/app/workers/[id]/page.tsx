"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";

import { Avatar } from "@/components/Avatar";
import { FavoriteWorkerButton } from "@/components/FavoriteWorkerButton";
import { ProfileRow, ReviewList } from "@/components/profile";
import { RequireAuth } from "@/components/RequireAuth";
import { DetailSkeleton, ErrorText, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { prefectureLabel } from "@/lib/prefectures";
import { useAsync } from "@/lib/useAsync";

function WorkerProfileView() {
  const p = useTranslations("profile");
  const ob = useTranslations("onboarding");
  const rt = useTranslations("reviews");
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const { api, me } = useAuth();
  const profile = useAsync(() => api.worker(id), [id]);
  const reviews = useAsync(() => api.workerReviews(id), [id]);
  // Portfolio photos are decoration — a failure must not break the profile.
  const photos = useAsync(async () => {
    try {
      return await api.workerPhotos(id);
    } catch {
      return [];
    }
  }, [id]);

  if (profile.loading) return <DetailSkeleton />;
  if (profile.error || !profile.data) return <ErrorText message={profile.error || "not found"} />;
  const w = profile.data;
  const isContractor = me?.user.user_type === "contractor";

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar name={w.display_name} size="lg" />
            <h1 className="text-lg font-bold tracking-tight [overflow-wrap:anywhere] sm:text-xl">
              {w.display_name}
            </h1>
            {isContractor && (
              <FavoriteWorkerButton workerId={w.user_id} workerName={w.display_name} />
            )}
          </div>
          <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
            {ob(w.worker_class)}
          </span>
        </div>
        <ProfileRow label={p("trust")} value={`★ ${Number(w.trust_score).toFixed(1)}`} />
        <ProfileRow label={p("experience")} value={p("experienceYears", { years: w.years_experience })} />
        {(w.prefecture || w.area) && (
          <ProfileRow
            label={p("region")}
            value={[prefectureLabel(w.prefecture, locale), w.area].filter(Boolean).join(" / ")}
          />
        )}
        {w.current_employer && (
          <ProfileRow label={p("employer")} value={w.current_employer} />
        )}
        {w.trades?.length > 0 && <ProfileRow label={p("trades")} value={w.trades.join(", ")} />}
        {w.qualifications?.length > 0 && (
          <ProfileRow label={p("qualifications")} value={w.qualifications.join(", ")} />
        )}
        {w.skills?.length > 0 && <ProfileRow label={p("skills")} value={w.skills.join(", ")} />}
        {w.tools?.length > 0 && <ProfileRow label={p("tools")} value={w.tools.join(", ")} />}
        {w.bio && (
          <div>
            <p className="field-label">{p("about")}</p>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{w.bio}</p>
          </div>
        )}
      </div>

      {photos.data && photos.data.length > 0 && (
        <div className="card space-y-2">
          <h2 className="font-semibold">{p("photos")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {photos.data.map((ph) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={ph.id}
                src={ph.read_url}
                alt=""
                className="aspect-square w-full rounded-lg border border-gray-200 object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {w.work_history?.length > 0 && (
        <div className="card space-y-1">
          <h2 className="font-semibold">{p("career")}</h2>
          <ul className="space-y-1 text-sm text-gray-700">
            {w.work_history.map((h, i) => (
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

      <div className="card space-y-2">
        <h2 className="font-semibold">{rt("title")}</h2>
        {reviews.loading ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <ReviewList reviews={reviews.data ?? []} />
        )}
      </div>
    </div>
  );
}

export default function WorkerProfilePage() {
  return (
    <RequireAuth>
      <WorkerProfileView />
    </RequireAuth>
  );
}
