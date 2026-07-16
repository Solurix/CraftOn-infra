// Suggested construction trades for the guided trade picker. Workers can also
// add custom trades via free text, so this list is a convenience, not a limit.
export const COMMON_TRADES = [
  "大工",
  "鳶",
  "電気工",
  "配管",
  "内装",
  "左官",
  "塗装",
  "鉄筋",
  "型枠",
  "解体",
  "重機オペレーター",
  "土工",
] as const;

import type { Trade } from "@/lib/api/models";
import type { TradeOption } from "@/components/WorkerProfileFields";

// Map catalog rows to picker options: value = canonical stored name (ja),
// label = localized display.
export function tradeOptionsFor(
  trades: Trade[] | null | undefined,
  locale: string,
): TradeOption[] {
  return (trades ?? [])
    .filter((t) => t.active)
    .map((t) => ({ value: t.name_ja, label: locale === "ja" ? t.name_ja : t.name_en }));
}

// Localized label for a stored trade value (unknown values shown as-is).
export function tradeLabel(
  value: string,
  trades: Trade[] | null | undefined,
  locale: string,
): string {
  if (locale === "ja") return value;
  return trades?.find((t) => t.name_ja === value)?.name_en ?? value;
}
