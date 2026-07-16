"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { DevicesCard } from "@/components/DevicesCard";
import { PhotoManager } from "@/components/PhotoManager";
import { PrefectureSelect } from "@/components/PrefectureSelect";
import { ResidenceCardSection } from "@/components/ResidenceCardSection";
import { ProfileCompleteness } from "@/components/ProfileCompleteness";
import { RequireAuth } from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";
import { VisaStatusBanner } from "@/components/VisaStatusBanner";
import { ErrorText } from "@/components/ui";
import {
  contractorCompleteness,
  workerCompleteness,
} from "@/lib/completeness";
import {
  isWorkerFormValid,
  WorkerProfileFields,
  workerFormFromProfile,
  workerFormToPayload,
  type WorkerFormValue,
} from "@/components/WorkerProfileFields";
import type { Me, Trade } from "@/lib/api/models";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { tradeOptionsFor } from "@/lib/trades";
import { useAsync } from "@/lib/useAsync";

function WorkerSettings({ me }: { me: Me }) {
  // Load the trade catalog first: the form init needs it to split stored
  // trades into catalog chips vs custom tags.
  const { api } = useAuth();
  const catalog = useAsync(() => api.trades().catch(() => []), []);
  if (catalog.loading) return null;
  return <WorkerSettingsForm me={me} catalog={catalog.data ?? []} />;
}

function WorkerSettingsForm({ me, catalog }: { me: Me; catalog: Trade[] }) {
  const p = useTranslations("profile");
  const auth = useTranslations("auth");
  const common = useTranslations("common");
  const locale = useLocale();
  const { api, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<WorkerFormValue>(() =>
    workerFormFromProfile(
      me.user.display_name,
      me.worker_profile!,
      catalog.map((t) => t.name_ja),
    ),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const patch = (pp: Partial<WorkerFormValue>) => setForm((f) => ({ ...f, ...pp }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError("");
    try {
      await api.updateWorker(workerFormToPayload(form));
      await refresh();
      setSaved(true);
      toast.success(p("saved"));
    } catch (e) {
      const msg = humanizeError(e, common("networkError"));
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight sm:text-xl">{p("edit")}</h1>
        <Link href={`/workers/${me.user.id}`} className="link text-sm">
          {p("view")}
        </Link>
      </div>
      <Field label={auth("displayName")}>
        <input
          className="field-input"
          value={form.display_name}
          onChange={(e) => patch({ display_name: e.target.value })}
        />
      </Field>
      <WorkerProfileFields
        value={form}
        onChange={patch}
        tradeOptions={tradeOptionsFor(catalog, locale)}
        // Non-JP workers can re-upload rejected/missing residence documents
        // here; saving the form PATCHes the new doc ids to /workers/me.
        residenceDocsSlot={<ResidenceCardSection value={form} onChange={patch} />}
      />
      <button className="btn-primary w-full" disabled={!isWorkerFormValid(form)}>
        {common("save")}
      </button>
      {saved && <p className="text-sm text-green-700">{p("saved")}</p>}
      <ErrorText message={error} />
    </form>
  );
}

function ContractorSettings({ me }: { me: Me }) {
  const t = useTranslations("onboarding");
  const p = useTranslations("profile");
  const auth = useTranslations("auth");
  const common = useTranslations("common");
  const { api, refresh } = useAuth();
  const toast = useToast();
  const cp = me.contractor_profile!;
  const [form, setForm] = useState({
    display_name: me.user.display_name,
    company_name: cp.company_name,
    contact_person: cp.contact_person,
    prefecture: cp.prefecture,
    address: cp.address ?? "",
    bio: cp.bio ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError("");
    try {
      await api.updateContractor({
        display_name: form.display_name,
        company_name: form.company_name,
        contact_person: form.contact_person,
        prefecture: form.prefecture,
        address: form.address || null,
        bio: form.bio || null,
      });
      await refresh();
      setSaved(true);
      toast.success(p("saved"));
    } catch (e) {
      const msg = humanizeError(e, common("networkError"));
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight sm:text-xl">{p("edit")}</h1>
        <Link href={`/contractors/${me.user.id}`} className="link text-sm">
          {p("view")}
        </Link>
      </div>
      <Field label={auth("displayName")}>
        <input className="field-input" value={form.display_name} onChange={(e) => set("display_name", e.target.value)} />
      </Field>
      <Field label={t("companyName")}>
        <input className="field-input" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
      </Field>
      <Field label={t("contactPerson")}>
        <input className="field-input" value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} />
      </Field>
      <Field label={t("prefecture")}>
        <PrefectureSelect value={form.prefecture} onChange={(v) => set("prefecture", v)} />
      </Field>
      <Field label={t("address")}>
        <input className="field-input" value={form.address} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <Field label={t("bio")}>
        <textarea className="field-input" value={form.bio} onChange={(e) => set("bio", e.target.value)} />
      </Field>
      <button className="btn-primary w-full">{common("save")}</button>
      {saved && <p className="text-sm text-green-700">{p("saved")}</p>}
      <ErrorText message={error} />
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function SetPasswordCard() {
  const p = useTranslations("profile");
  const auth = useTranslations("auth");
  const common = useTranslations("common");
  const { api, refresh } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError("");
    try {
      await api.setPassword(password);
      setPassword("");
      await refresh();
      setSaved(true);
      toast.success(p("passwordSaved"));
    } catch (e) {
      const msg = humanizeError(e, common("networkError"));
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-2">
      <h2 className="font-semibold">{p("changePassword")}</h2>
      <p className="text-xs text-gray-500">{p("changePasswordHint")}</p>
      <input
        type="password"
        className="field-input"
        minLength={8}
        aria-label={auth("passwordLabel")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn-primary w-full" disabled={password.length < 8}>
        {p("changePassword")}
      </button>
      {saved && <p className="text-sm text-green-700">{p("passwordSaved")}</p>}
      <ErrorText message={error} />
    </form>
  );
}

function AccountSettingsCard({ me }: { me: Me }) {
  const p = useTranslations("profile");
  const auth = useTranslations("auth");
  const common = useTranslations("common");
  const { api, refresh } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState(me.user.username);
  const [email, setEmail] = useState(me.user.email);
  const [error, setError] = useState("");

  const dirty = username !== me.user.username || email !== me.user.email;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.updateAccount({ username, email });
      await refresh();
      toast.success(p("accountSaved"));
    } catch (e) {
      const msg = humanizeError(e, common("networkError"));
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-semibold">{p("account")}</h2>
      <Field label={auth("usernameLabel")}>
        <input
          className="field-input"
          autoCapitalize="none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </Field>
      <Field label={auth("emailLabel")}>
        <input
          type="email"
          className="field-input"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <button className="btn-primary w-full" disabled={!dirty}>
        {common("save")}
      </button>
      <ErrorText message={error} />
    </form>
  );
}

function Settings() {
  const { me } = useAuth();
  if (!me) return null;
  const isWorker = me.user.user_type === "worker" && me.worker_profile;
  const isContractor = me.user.user_type === "contractor" && me.contractor_profile;
  const completeness = isWorker
    ? workerCompleteness(me.worker_profile!)
    : isContractor
      ? contractorCompleteness(me.contractor_profile!)
      : null;
  return (
    <div className="space-y-4">
      {isWorker && <VisaStatusBanner profile={me.worker_profile} />}
      {completeness && <ProfileCompleteness data={completeness} />}
      {isWorker ? (
        <WorkerSettings me={me} />
      ) : isContractor ? (
        <ContractorSettings me={me} />
      ) : null}
      {(isWorker || isContractor) && <PhotoManager />}
      <AccountSettingsCard me={me} />
      <SetPasswordCard />
      <DevicesCard />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth requireApproved={false}>
      <Settings />
    </RequireAuth>
  );
}
