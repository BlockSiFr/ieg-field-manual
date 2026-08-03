#!/usr/bin/env npx tsx
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const required = [
  "public/mockups/book-cover.svg",
  "public/images/og-dastor.svg",
  "public/favicon.svg",
  "src/content/config/publication.json",
  "storage/manifests/content-index.json",
];

let ok = true;
for (const rel of required) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) {
    console.error("MISSING", rel);
    ok = false;
  }
}

// Scan public for suspiciously large markdown/pdf that might be full manual
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(pdf|docx|md)$/i.test(name) && st.size > 200_000) {
      console.error("POSSIBLE_PROTECTED_LEAK", p, st.size);
      ok = false;
    }
  }
}
walk(join(ROOT, "public"));
if (!ok) process.exit(1);
console.log("Assets verified");
