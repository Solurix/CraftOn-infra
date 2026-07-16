"use client";

// Deterministic initials avatar — gives workers, contractors, and chat a visual
// identity without needing uploaded images (those land later, see
// docs/FEATURE_RECOMMENDATIONS.md §6.8 / BLOCKERS.md). The colour is derived
// from the name so the same person is always the same hue.

const PALETTE = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-indigo-100 text-indigo-700",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  // For CJK names a single leading character reads best; for latin names take
  // the first letter of the first two words.
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function hue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % PALETTE.length;
}

const SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const label = name?.trim() || "?";
  return (
    <span
      aria-hidden
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZE[size]} ${PALETTE[hue(label)]}`}
    >
      {initials(label)}
    </span>
  );
}
