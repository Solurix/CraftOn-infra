// Canonical list of Japan's 47 prefectures. Stored values are the romaji
// identifiers already used across the API (config `service_area_prefectures`,
// seeds, job rows: "Tokyo", "Kanagawa", …); the ja labels are display-only.
export type Prefecture = { value: string; ja: string };

export const PREFECTURES: readonly Prefecture[] = [
  { value: "Hokkaido", ja: "北海道" },
  { value: "Aomori", ja: "青森県" },
  { value: "Iwate", ja: "岩手県" },
  { value: "Miyagi", ja: "宮城県" },
  { value: "Akita", ja: "秋田県" },
  { value: "Yamagata", ja: "山形県" },
  { value: "Fukushima", ja: "福島県" },
  { value: "Ibaraki", ja: "茨城県" },
  { value: "Tochigi", ja: "栃木県" },
  { value: "Gunma", ja: "群馬県" },
  { value: "Saitama", ja: "埼玉県" },
  { value: "Chiba", ja: "千葉県" },
  { value: "Tokyo", ja: "東京都" },
  { value: "Kanagawa", ja: "神奈川県" },
  { value: "Niigata", ja: "新潟県" },
  { value: "Toyama", ja: "富山県" },
  { value: "Ishikawa", ja: "石川県" },
  { value: "Fukui", ja: "福井県" },
  { value: "Yamanashi", ja: "山梨県" },
  { value: "Nagano", ja: "長野県" },
  { value: "Gifu", ja: "岐阜県" },
  { value: "Shizuoka", ja: "静岡県" },
  { value: "Aichi", ja: "愛知県" },
  { value: "Mie", ja: "三重県" },
  { value: "Shiga", ja: "滋賀県" },
  { value: "Kyoto", ja: "京都府" },
  { value: "Osaka", ja: "大阪府" },
  { value: "Hyogo", ja: "兵庫県" },
  { value: "Nara", ja: "奈良県" },
  { value: "Wakayama", ja: "和歌山県" },
  { value: "Tottori", ja: "鳥取県" },
  { value: "Shimane", ja: "島根県" },
  { value: "Okayama", ja: "岡山県" },
  { value: "Hiroshima", ja: "広島県" },
  { value: "Yamaguchi", ja: "山口県" },
  { value: "Tokushima", ja: "徳島県" },
  { value: "Kagawa", ja: "香川県" },
  { value: "Ehime", ja: "愛媛県" },
  { value: "Kochi", ja: "高知県" },
  { value: "Fukuoka", ja: "福岡県" },
  { value: "Saga", ja: "佐賀県" },
  { value: "Nagasaki", ja: "長崎県" },
  { value: "Kumamoto", ja: "熊本県" },
  { value: "Oita", ja: "大分県" },
  { value: "Miyazaki", ja: "宮崎県" },
  { value: "Kagoshima", ja: "鹿児島県" },
  { value: "Okinawa", ja: "沖縄県" },
] as const;

const JA_BY_VALUE = new Map(PREFECTURES.map((p) => [p.value, p.ja]));

// Display label for a stored prefecture. Unknown values (legacy free-text
// entries) are shown as-is instead of disappearing.
export function prefectureLabel(value: string | null | undefined, locale: string): string {
  if (!value) return "";
  if (locale === "ja") return JA_BY_VALUE.get(value) ?? value;
  return value;
}
