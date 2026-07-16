// Pure helpers for the job-posting form (no JSX/hooks): the form shape, its
// defaults, time utilities, and converters from a stored job / saved draft.
import type { Job, JobUpdate } from "@/lib/api/models";

export type JobForm = {
  trades: string[]; // selected catalog trades
  trades_other: string[]; // custom trades
  work_date: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM on a 36-hour clock (24+ = ends the NEXT day)
  prefecture: string;
  area: string;
  address: string;
  daily_wage: number | string;
  headcount: number | string;
  notes: string;
  photo_doc_ids: string[];
};

export const DEFAULTS: JobForm = {
  trades: [],
  trades_other: [],
  work_date: "",
  start_time: "08:00",
  end_time: "17:00",
  prefecture: "Tokyo",
  area: "",
  address: "",
  daily_wage: 18000,
  headcount: 1,
  notes: "",
  photo_doc_ids: [],
};

export const minutes = (hhmm: string): number =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// End-time choices on a 36-hour clock, 30-minute steps (24+ = next day).
export const END_TIME_CHOICES = Array.from({ length: 72 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
}).filter((t) => t !== "00:00");

// 24+ end times wrap to the real clock time; the API stores end <= start as
// "ends the next day".
export function toApiEndTime(end: string): string {
  const h = Number(end.slice(0, 2));
  return h >= 24 ? `${String(h - 24).padStart(2, "0")}:${end.slice(3, 5)}` : end;
}

// `keepDate` (edit mode) keeps the job's own date; duplication gets a fresh one.
export function jobToForm(job: Job, catalogValues: string[], keepDate = false): JobForm {
  // A stored overnight shift (end <= start) surfaces as 24+ in the picker.
  let end = job.end_time.slice(0, 5);
  if (end <= job.start_time.slice(0, 5)) {
    end = `${Number(end.slice(0, 2)) + 24}:${end.slice(3, 5)}`;
  }
  return {
    trades: job.trades.filter((t) => catalogValues.includes(t)),
    trades_other: job.trades.filter((t) => !catalogValues.includes(t)),
    work_date: keepDate ? job.work_date : "", // a reposted job gets a fresh date
    start_time: job.start_time.slice(0, 5),
    end_time: end,
    prefecture: job.prefecture,
    area: job.area ?? "",
    address: job.address ?? "",
    daily_wage: job.daily_wage,
    headcount: job.headcount,
    notes: job.notes ?? "",
    photo_doc_ids: job.photo_doc_ids ?? [],
  };
}

// Edit mode sends ONLY the fields that changed vs the loaded job: unchanged
// fields must not be re-sent, or they'd trip the server's core-terms lock once
// workers are confirmed. Both sides are JobForm (current form vs the original
// `jobToForm` result), compared after the same normalization the create path
// applies.
export function diffJobForm(form: JobForm, original: JobForm): JobUpdate {
  const out: JobUpdate = {};
  const allTrades = (f: JobForm) => [...f.trades, ...f.trades_other];
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(allTrades(form), allTrades(original))) out.trades = allTrades(form);
  if (form.work_date !== original.work_date) out.work_date = form.work_date;
  if (form.start_time !== original.start_time) out.start_time = `${form.start_time}:00`;
  if (form.end_time !== original.end_time) out.end_time = `${toApiEndTime(form.end_time)}:00`;
  if (form.prefecture !== original.prefecture) out.prefecture = form.prefecture;
  if (form.area !== original.area) out.area = form.area || null;
  if (form.address !== original.address) out.address = form.address || null;
  if (Number(form.daily_wage) !== Number(original.daily_wage)) out.daily_wage = Number(form.daily_wage);
  if (Number(form.headcount) !== Number(original.headcount)) out.headcount = Number(form.headcount);
  if (form.notes !== original.notes) out.notes = form.notes || null;
  if (!same(form.photo_doc_ids, original.photo_doc_ids)) out.photo_doc_ids = form.photo_doc_ids;
  return out;
}

// Drafts/templates written before trades became chips stored them as a CSV
// string — normalize so an old draft doesn't crash the form.
export function normalizeForm(raw: unknown): JobForm {
  const d = { ...DEFAULTS, ...(raw as Partial<JobForm>) };
  if (typeof (d.trades as unknown) === "string") {
    d.trades_other = (d.trades as unknown as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    d.trades = [];
  }
  if (!Array.isArray(d.trades_other)) d.trades_other = [];
  if (!Array.isArray(d.photo_doc_ids)) d.photo_doc_ids = [];
  return d;
}
