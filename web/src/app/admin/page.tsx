"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";

import { AdminsTab } from "./tabs/AdminsTab";
import { ConfigTab } from "./tabs/ConfigTab";
import { DebugTab } from "./tabs/DebugTab";
import { DevicesTab } from "./tabs/DevicesTab";
import { JobsTab } from "./tabs/JobsTab";
import { MatchingsTab } from "./tabs/MatchingsTab";
import { TradesTab } from "./tabs/TradesTab";
import { UsersTab } from "./tabs/UsersTab";

type Tab = "users" | "jobs" | "matchings" | "trades" | "devices" | "admins" | "debug" | "config";

function AdminDashboard() {
  const t = useTranslations("admin");
  const [tab, setTab] = useState<Tab>("users");
  const tabs: { id: Tab; label: string }[] = [
    { id: "users", label: t("tabUsers") },
    { id: "jobs", label: t("tabJobs") },
    { id: "matchings", label: t("tabMatchings") },
    { id: "trades", label: t("tabTrades") },
    { id: "devices", label: t("tabDevices") },
    { id: "admins", label: t("tabAdmins") },
    { id: "debug", label: t("tabDebug") },
    { id: "config", label: t("tabConfig") },
  ];

  return (
    <div className="space-y-4">
      {/* More tabs than a phone is wide: scroll the strip inside its own
          container so the page body never overflows horizontally. */}
      <nav className="-mx-4 overflow-x-auto border-b border-gray-200 px-4 pb-2">
        <div className="flex w-max gap-2 text-sm">
          {tabs.map((x) => (
            <button
              key={x.id}
              onClick={() => setTab(x.id)}
              className={
                tab === x.id
                  ? "shrink-0 whitespace-nowrap rounded-full bg-brand px-3 py-1 font-medium text-white"
                  : "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-gray-600 hover:bg-gray-100"
              }
            >
              {x.label}
            </button>
          ))}
        </div>
      </nav>
      {tab === "users" && <UsersTab />}
      {tab === "jobs" && <JobsTab />}
      {tab === "matchings" && <MatchingsTab />}
      {tab === "trades" && <TradesTab />}
      {tab === "devices" && <DevicesTab />}
      {tab === "admins" && <AdminsTab />}
      {tab === "debug" && <DebugTab />}
      {tab === "config" && <ConfigTab />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth role="admin" requireApproved={false}>
      <AdminDashboard />
    </RequireAuth>
  );
}
