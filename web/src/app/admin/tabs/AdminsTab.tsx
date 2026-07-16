"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { PhoneInput } from "@/components/PhoneInput";
import { ErrorText, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { humanizeError } from "@/lib/errorMessage";
import { useAsync } from "@/lib/useAsync";

export function AdminsTab() {
  const t = useTranslations("admin");
  const auth = useTranslations("auth");
  const common = useTranslations("common");
  const { api } = useAuth();
  const admins = useAsync(() => api.adminAdmins(), []);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.createAdmin({
        phone_number: phone,
        username,
        email,
        password,
        display_name: name,
      });
      setPhone("");
      setName("");
      setUsername("");
      setEmail("");
      setPassword("");
      admins.reload();
    } catch (e) {
      setError(humanizeError(e, common("networkError")));
    }
  };

  const canSubmit = phone && name && username && email && password.length >= 8;

  return (
    <div className="space-y-3">
      <form onSubmit={create} className="card space-y-2">
        <h2 className="font-semibold">{t("addAdmin")}</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[9rem] flex-1">
            <span className="field-label">{auth("displayName")}</span>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="min-w-[9rem] flex-1">
            <span className="field-label">{auth("usernameLabel")}</span>
            <input
              className="field-input"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label className="min-w-[9rem] flex-1">
            <span className="field-label">{auth("emailLabel")}</span>
            <input
              className="field-input"
              type="email"
              autoCapitalize="none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <div className="min-w-[13rem] flex-1">
            <span className="field-label">{auth("phoneLabel")}</span>
            <PhoneInput value={phone} onChange={setPhone} required />
          </div>
          <label className="min-w-[9rem] flex-1">
            <span className="field-label">{auth("passwordLabel")}</span>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="btn-primary" disabled={!canSubmit}>
            {t("createAdmin")}
          </button>
        </div>
        <ErrorText message={error} />
      </form>
      {admins.loading ? (
        <Spinner />
      ) : !admins.data || admins.data.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">{t("noAdmins")}</p>
      ) : (
        <ul className="space-y-2">
          {admins.data.map((a) => (
            <li key={a.id} className="card flex items-center justify-between">
              <span className="font-medium">{a.display_name}</span>
              <span className="text-xs text-gray-500">{a.phone_number}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
