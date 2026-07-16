// Pure form-model for the worker profile: types, initializers, validation and
// the API payload builder. Shared by the onboarding form and the profile
// editor (no JSX/hooks — safe to import from tests and server code).
import type { WorkerOnboarding, WorkerProfile } from "@/lib/api/models";
import { COMMON_TRADES } from "@/lib/trades";

export type WorkHistoryRow = {
  company: string;
  trade: string;
  years: number;
  description: string;
};

// A picker option for the trade catalog (value = canonical stored name_ja,
// label = localized display). Falls back to COMMON_TRADES when the catalog
// hasn't loaded.
export type TradeOption = { value: string; label: string };

// Controlled form state shared by the onboarding form and the profile editor.
export type WorkerFormValue = {
  display_name: string;
  family_name: string;
  given_name: string;
  middle_name: string;
  name_kana: string;
  email: string;
  nationality: string; // "JP" or another 2-letter code
  worker_class: "employee" | "freelance";
  trades: string[]; // selected catalog-trade chips only
  trades_other: string[]; // custom trades (merged on submit)
  tools: string[];
  current_employer: string;
  current_employer_public: boolean;
  prefecture: string;
  area: string;
  work_history: WorkHistoryRow[];
  qualifications: string[];
  skills: string[];
  bio: string;
  years_experience: number;
  has_insurance: boolean;
  visa_expiry_date: string;
  // Set only when a new residence-card image was uploaded in this form session
  // (onboarding or profile re-upload); null = unchanged, and the payload then
  // omits the field so a PATCH never clobbers the stored document link.
  residence_card_front_doc_id: string | null;
  residence_card_back_doc_id: string | null;
};

export function emptyWorkerForm(displayName = ""): WorkerFormValue {
  return {
    display_name: displayName,
    family_name: "",
    given_name: "",
    middle_name: "",
    name_kana: "",
    email: "",
    nationality: "JP",
    worker_class: "employee",
    trades: [],
    trades_other: [],
    tools: [],
    current_employer: "",
    current_employer_public: false,
    prefecture: "",
    area: "",
    work_history: [],
    qualifications: [],
    skills: [],
    bio: "",
    years_experience: 0,
    has_insurance: false,
    visa_expiry_date: "",
    residence_card_front_doc_id: null,
    residence_card_back_doc_id: null,
  };
}

export function workerFormFromProfile(
  displayName: string,
  wp: WorkerProfile,
  catalogValues: readonly string[] = COMMON_TRADES,
): WorkerFormValue {
  return {
    display_name: displayName,
    // Legacy profiles predate the structured parts — surface the stored
    // full_name in the family field so nothing silently disappears.
    family_name: wp.family_name ?? wp.full_name ?? "",
    given_name: wp.given_name ?? "",
    middle_name: wp.middle_name ?? "",
    name_kana: wp.name_kana ?? "",
    email: wp.email ?? "",
    nationality: wp.nationality ?? "JP",
    worker_class: wp.worker_class as "employee" | "freelance",
    trades: (wp.trades ?? []).filter((t) => catalogValues.includes(t)),
    trades_other: (wp.trades ?? []).filter((t) => !catalogValues.includes(t)),
    tools: wp.tools ?? [],
    current_employer: wp.current_employer ?? "",
    current_employer_public: wp.current_employer_public ?? false,
    prefecture: wp.prefecture ?? "",
    area: wp.area ?? "",
    work_history: (wp.work_history ?? []).map((w) => ({
      company: w.company ?? "",
      trade: w.trade ?? "",
      years: w.years ?? 0,
      description: w.description ?? "",
    })),
    qualifications: wp.qualifications ?? [],
    skills: wp.skills ?? [],
    bio: wp.bio ?? "",
    years_experience: wp.years_experience ?? 0,
    has_insurance: wp.has_insurance,
    visa_expiry_date: wp.visa_expiry_date ?? "",
    // Start null (= unchanged); only a fresh upload in this session sets them.
    residence_card_front_doc_id: null,
    residence_card_back_doc_id: null,
  };
}

// True when the nationality choice is complete: Japan, or a non-JP 2-letter code.
export function isWorkerFormValid(v: WorkerFormValue): boolean {
  return (
    v.nationality.toUpperCase() === "JP" || v.nationality.trim().length === 2
  );
}

// Build the API payload from the form. Shared by onboarding (WorkerOnboarding)
// and PATCH (WorkerUpdate) — both accept this superset of keys.
export function workerFormToPayload(v: WorkerFormValue): WorkerOnboarding {
  const isJp = v.nationality.toUpperCase() === "JP";
  // Merge chip-selected catalog trades with the custom ones (deduped).
  const trades = [...new Set([...v.trades, ...v.trades_other])];
  const workHistory = v.work_history
    .filter((w) => w.company.trim() || w.description.trim())
    .map((w) => ({
      company: w.company.trim(),
      trade: w.trade.trim(),
      years: Number(w.years) || 0,
      description: w.description.trim(),
    }));
  // The dedicated years-of-experience input is gone (redundant with the work
  // history); derive the total from the history when it has any years.
  const historyYears = workHistory.reduce((sum, w) => sum + w.years, 0);
  return {
    // Blank means "not chosen" — the API then keeps/derives a sensible default
    // (worker's name) instead of persisting an empty display name.
    display_name: v.display_name || null,
    // Never coerce a blank "Other" nationality to JP — the form blocks submit
    // until a 2-letter code is entered (isWorkerFormValid), so the visa gate
    // can't be bypassed.
    nationality: isJp ? "JP" : v.nationality.toUpperCase().slice(0, 2),
    worker_class: v.worker_class,
    trades,
    tools: v.tools,
    family_name: v.family_name.trim() || null,
    given_name: v.given_name.trim() || null,
    middle_name: v.middle_name.trim() || null,
    name_kana: v.name_kana || null,
    email: v.email || null,
    current_employer: v.current_employer || null,
    current_employer_public: v.current_employer_public,
    prefecture: v.prefecture || null,
    area: v.area || null,
    work_history: workHistory,
    qualifications: v.qualifications,
    skills: v.skills,
    bio: v.bio || null,
    years_experience: historyYears > 0 ? historyYears : Number(v.years_experience) || 0,
    has_insurance: v.has_insurance,
    visa_expiry_date: !isJp && v.visa_expiry_date ? v.visa_expiry_date : null,
    // Only send document links that were (re)uploaded in this session — an
    // absent key leaves the server's stored link untouched on PATCH.
    ...(v.residence_card_front_doc_id
      ? { residence_card_front_doc_id: v.residence_card_front_doc_id }
      : {}),
    ...(v.residence_card_back_doc_id
      ? { residence_card_back_doc_id: v.residence_card_back_doc_id }
      : {}),
  };
}
