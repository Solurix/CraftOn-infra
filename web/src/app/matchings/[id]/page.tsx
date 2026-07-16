"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { QuickReplies } from "@/components/QuickReplies";
import { RequireAuth } from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";
import { BackLink, DetailSkeleton, ErrorText, Skeleton, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import type { Matching } from "@/lib/api/models";
import { humanizeError } from "@/lib/errorMessage";
import { formatYen } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

function Lifecycle({ matching, role, onChanged }: { matching: Matching; role: string; onChanged: () => void }) {
  const t = useTranslations("matchings");
  const common = useTranslations("common");
  const { api } = useAuth();
  const toast = useToast();
  const [error, setError] = useState("");

  const act = async (fn: () => Promise<unknown>, successMsg?: string) => {
    setError("");
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      onChanged();
    } catch (e) {
      const msg = humanizeError(e, common("networkError"));
      setError(msg);
      toast.error(msg);
    }
  };

  const id = matching.id;
  const isWorker = role === "worker";
  const isContractor = role === "contractor";
  const active = matching.status === "confirmed" || matching.status === "checked_in";

  const cancel = () => {
    if (typeof window !== "undefined" && !window.confirm(t("cancelConfirm"))) return;
    act(() => api.cancelMatching(id), t("canceled"));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {isWorker && matching.status === "confirmed" && (
          <button className="btn-primary" onClick={() => act(() => api.checkIn(id), t("checkedIn"))}>
            {t("checkIn")}
          </button>
        )}
        {isWorker && matching.status === "checked_in" && !matching.completion_requested_at && (
          <button className="btn-primary" onClick={() => act(() => api.completeRequest(id), t("completionRequested"))}>
            {t("completeRequest")}
          </button>
        )}
        {isContractor &&
          matching.status === "checked_in" &&
          matching.completion_requested_at && (
            <button className="btn-primary" onClick={() => act(() => api.approveCompletion(id), t("completionApproved"))}>
              {t("approveCompletion")}
            </button>
          )}
        {active && (
          <button className="btn-danger" onClick={cancel}>
            {t("cancel")}
          </button>
        )}
      </div>
      {active && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⏰ {t("cancelPolicy")}
        </p>
      )}
      <ErrorText message={error} />
    </div>
  );
}

function ChatPanel({ matchingId }: { matchingId: string }) {
  const t = useTranslations("chat");
  const common = useTranslations("common");
  const { api, me } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => api.messages(matchingId), [matchingId]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.sendMessage(matchingId, text);
      setText("");
      reload();
    } catch (e) {
      toast.error(humanizeError(e, common("networkError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">{t("title")}</h2>
      {/* Why messages can look altered — masking is enforced server-side. */}
      <p className="flex items-start gap-1.5 rounded-lg border border-brand/20 bg-brand-soft px-3 py-2 text-xs text-gray-600">
        <span aria-hidden>🔒</span>
        {t("maskingInfo")}
      </p>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="ml-auto h-6 w-1/2" />
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-gray-500">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {data.map((msg) => {
            const mine = msg.sender_id === me?.user.id;
            return (
              <li key={msg.id} className={mine ? "text-right" : "text-left"}>
                <span
                  className={`inline-block rounded-lg px-3 py-1 text-sm ${
                    mine ? "bg-brand text-white" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {msg.body}
                </span>
                {msg.was_filtered && (
                  <p className="text-[10px] text-amber-600">{t("filteredNotice")}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <QuickReplies currentText={text} onPick={setText} />
      <form onSubmit={send} className="flex gap-2">
        <input
          className="field-input"
          placeholder={t("placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-primary" disabled={busy}>
          {t("send")}
        </button>
      </form>
    </div>
  );
}

function ReviewPanel({ matchingId, onDone }: { matchingId: string; onDone: () => void }) {
  const t = useTranslations("reviews");
  const common = useTranslations("common");
  const { api } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.leaveReview(matchingId, { rating, comment: comment || null, tags: [] });
      setDone(true);
      onDone();
    } catch (e) {
      setError(humanizeError(e, common("networkError")));
    }
  };

  if (done) return <p className="card text-sm text-green-700">{t("submitted")}</p>;

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">{t("leave")}</h2>
      <div>
        <label className="field-label">{t("rating")}</label>
        <select className="field-input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">{t("comment")}</label>
        <textarea className="field-input" value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <button className="btn-primary w-full">{t("leave")}</button>
      <ErrorText message={error} />
    </form>
  );
}

function MatchingDetail() {
  const t = useTranslations("matchings");
  const { id } = useParams<{ id: string }>();
  const { api, me } = useAuth();
  const { data: m, loading, error, reload } = useAsync(() => api.matching(id), [id]);
  const [showTerms, setShowTerms] = useState(false);

  if (loading) return <DetailSkeleton />;
  if (error || !m) return <ErrorText message={error || "not found"} />;

  const role = me?.user.user_type ?? "";

  return (
    <div className="space-y-4">
      <BackLink href="/matchings" label={t("title")} />

      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">{t("detailTitle")}</h1>
          <StatusBadge status={m.status} />
        </div>
        {role === "contractor" && m.worker_display_name && (
          <Link href={`/workers/${m.worker_id}`} className="link text-sm">
            {m.worker_display_name}
          </Link>
        )}
        {role === "worker" && m.contractor_id && (
          <Link href={`/contractors/${m.contractor_id}`} className="link text-sm">
            {m.contractor_company_name}
          </Link>
        )}
        <Row label={t("contractType")} value={m.contract_type} />
        <Row label={t("wage")} value={formatYen(m.daily_wage)} />
        <Row
          label={t("fee")}
          value={`${formatYen(m.platform_fee)} (${m.fee_status === "paid" ? t("feePaid") : t("feeUnpaid")})`}
        />
        {m.terms && (
          <div>
            <button className="link text-sm" onClick={() => setShowTerms((v) => !v)}>
              {t("viewTerms")}
            </button>
            {showTerms && (
              <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-700">
                {m.terms}
              </pre>
            )}
          </div>
        )}
      </div>

      <Lifecycle matching={m} role={role} onChanged={reload} />

      <ChatPanel matchingId={id} />

      {m.status === "completed" && <ReviewPanel matchingId={id} onDone={reload} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function MatchingDetailPage() {
  return (
    <RequireAuth>
      <MatchingDetail />
    </RequireAuth>
  );
}
