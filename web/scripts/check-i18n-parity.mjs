// Fails the build if the ja/en message catalogs differ in key sets or have
// empty values. Mirrors the backend parity check (docs/11).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const load = (loc) =>
  JSON.parse(readFileSync(join(here, "..", "messages", `${loc}.json`), "utf8"));

// Flatten nested message objects to dotted keys.
const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" ? flatten(v, key) : [[key, v]];
  });

const locales = ["ja", "en"];
const maps = Object.fromEntries(
  locales.map((l) => [l, new Map(flatten(load(l)))]),
);

const allKeys = new Set(locales.flatMap((l) => [...maps[l].keys()]));
const problems = [];
for (const loc of locales) {
  for (const key of allKeys) {
    if (!maps[loc].has(key)) problems.push(`[${loc}] missing key: ${key}`);
    else if (String(maps[loc].get(key)).trim() === "")
      problems.push(`[${loc}] empty value: ${key}`);
  }
}

if (problems.length) {
  console.error("i18n parity check FAILED:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`i18n parity OK (${allKeys.size} keys, ${locales.join("/")}).`);
