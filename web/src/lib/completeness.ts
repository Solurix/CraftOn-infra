// Profile-completeness scoring. Drives the nudge meter that encourages workers
// and contractors to fill out their profile (better ranking / trust). Pure and
// fully testable; labels are resolved to i18n keys by the caller.
import type { ContractorProfile, WorkerProfile } from "./api/models";

export type Completeness = { pct: number; missing: string[] };

function summarize(checks: Array<[boolean, string]>): Completeness {
  const done = checks.filter(([ok]) => ok).length;
  return {
    pct: Math.round((done / checks.length) * 100),
    missing: checks.filter(([ok]) => !ok).map(([, key]) => key),
  };
}

export function workerCompleteness(p: WorkerProfile): Completeness {
  return summarize([
    [!!p.full_name, "fullName"],
    [p.trades.length > 0, "trades"],
    // The standalone years input is gone; experience now comes from the work
    // history (the API derives years_experience from it).
    [p.years_experience > 0 || p.work_history.length > 0, "experience"],
    [!!p.prefecture, "location"],
    [p.skills.length > 0, "skills"],
    [p.qualifications.length > 0, "qualifications"],
    [p.tools.length > 0, "tools"],
    [!!p.bio, "bio"],
    [p.work_history.length > 0, "workHistory"],
  ]);
}

export function contractorCompleteness(p: ContractorProfile): Completeness {
  return summarize([
    [!!p.company_name, "companyName"],
    [!!p.contact_person, "contactPerson"],
    [!!p.address, "address"],
    [!!p.bio, "bio"],
  ]);
}
