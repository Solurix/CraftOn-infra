"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { PrefectureSelect } from "@/components/PrefectureSelect";
import { ErrorText, Spinner } from "@/components/ui";
import {
  emptyWorkerForm,
  isWorkerFormValid,
  WorkerProfileFields,
  workerFormToPayload,
  type WorkerFormValue,
} from "@/components/WorkerProfileFields";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { tradeOptionsFor } from "@/lib/trades";
import { useAsync } from "@/lib/useAsync";

function WorkerForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const locale = useLocale();
  const { api } = useAuth();
  const catalog = useAsync(() => api.trades().catch(() => []), []);
  // No display-name prefill: signup no longer asks for one, and the API
  // derives it from the profile (worker name) on first onboarding.
  const [form, setForm] = useState<WorkerFormValue>(() => emptyWorkerForm());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nonJp = form.nationality.toUpperCase() !== "JP";
  const patch = (p: Partial<WorkerFormValue>) => setForm((f) => ({ ...f, ...p }));

  const uploadCard = async (side: "residence_card_front" | "residence_card_back") => {
    const ticket = await api.uploadUrl(side);
    // In dev/fake mode we skip the actual PUT; the storage_path is registrable.
    const doc = await api.registerDocument(side, ticket.storage_path);
    // The doc id lives in the form model; workerFormToPayload sends it along.
    if (side === "residence_card_front") patch({ residence_card_front_doc_id: doc.id });
    else patch({ residence_card_back_doc_id: doc.id });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.onboardWorker(workerFormToPayload(form));
      onDone();
    } catch (err) {
      setError(humanizeError(err, common("networkError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h1 className="text-lg font-bold">{t("workerTitle")}</h1>
      {/* Registration keeps only the essentials — work history, skills and the
          rest are added later from profile settings. */}
      <WorkerProfileFields
        value={form}
        onChange={patch}
        registration
        tradeOptions={tradeOptionsFor(catalog.data, locale)}
      />
      {nonJp && (
        <div className="flex gap-2 rounded-md bg-amber-50 p-3">
          <button type="button" className="btn-secondary" onClick={() => uploadCard("residence_card_front")}>
            {form.residence_card_front_doc_id ? "✓ " : ""}
            {t("residenceCardFront")}
          </button>
          <button type="button" className="btn-secondary" onClick={() => uploadCard("residence_card_back")}>
            {form.residence_card_back_doc_id ? "✓ " : ""}
            {t("residenceCardBack")}
          </button>
        </div>
      )}
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={busy || !isWorkerFormValid(form)}
      >
        {busy ? common("loading") : common("submit")}
      </button>
      <ErrorText message={error} />
    </form>
  );
}

function ContractorForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const { api } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [prefecture, setPrefecture] = useState("Tokyo");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.onboardContractor({
        company_name: companyName,
        contact_person: contactPerson,
        prefecture,
        address: address || null,
        bio: bio || null,
      });
      onDone();
    } catch (err) {
      setError(humanizeError(err, common("networkError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h1 className="text-lg font-bold">{t("contractorTitle")}</h1>
      <div>
        <label className="field-label">{t("companyName")}</label>
        <input className="field-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
      </div>
      <div>
        <label className="field-label">{t("contactPerson")}</label>
        <input className="field-input" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required />
      </div>
      <div>
        <label className="field-label" htmlFor="ob-prefecture">
          {t("prefecture")}
        </label>
        <PrefectureSelect
          id="ob-prefecture"
          value={prefecture}
          onChange={setPrefecture}
          required
        />
      </div>
      <div>
        <label className="field-label">{t("address")}</label>
        <input className="field-input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <label className="field-label">{t("bio")}</label>
        <textarea className="field-input" value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? common("loading") : common("submit")}
      </button>
      <ErrorText message={error} />
    </form>
  );
}

export default function OnboardingPage() {
  const { me, loading, refresh } = useAuth();
  const router = useRouter();

  // Account creation (with credentials) happens at /login; onboarding only
  // completes the profile. Anyone here without a signed-in account goes back.
  useEffect(() => {
    if (!loading && !me) router.replace("/login");
  }, [loading, me, router]);

  const onboarded = me && (me.has_worker_profile || me.has_contractor_profile);
  useEffect(() => {
    if (onboarded) router.replace("/");
  }, [onboarded, router]);

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        {!me ? (
          <Spinner />
        ) : me.user.user_type === "worker" ? (
          <WorkerForm onDone={() => refresh().then(() => router.replace("/"))} />
        ) : (
          <ContractorForm onDone={() => refresh().then(() => router.replace("/"))} />
        )}
      </div>
    </AppShell>
  );
}
