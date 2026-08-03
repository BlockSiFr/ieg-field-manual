#!/usr/bin/env npx tsx
/**
 * Deterministic DOCX extraction for DASTOR.
 * Prefer authoritative DOCX; fall back to catalog metadata with explicit provenance.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DOCX_CANDIDATES = [
  "/mnt/data/DASTOR Complete Field Manual FULL 3(1).docx",
  join(ROOT, "storage", "source", "DASTOR Complete Field Manual FULL 3(1).docx"),
];
const CATALOG = "/home/mauricewitten0/blocksifr-workspace/cortextrace/docs/dastor-catalog.md";

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function main() {
  mkdirSync(join(ROOT, "reports"), { recursive: true });
  mkdirSync(join(ROOT, ".receipts"), { recursive: true });
  const docx = DOCX_CANDIDATES.find((p) => existsSync(p));
  const chaptersDir = join(ROOT, "src/content/chapters");
  const chapterFiles = readdirSync(chaptersDir).filter((f) => f.endsWith(".json"));

  const report: string[] = [
    "# Content extraction report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Source",
  ];

  if (!docx) {
    report.push(
      "- Authoritative DOCX: **MISSING**",
      ...DOCX_CANDIDATES.map((p) => `  - checked: \`${p}\``),
      `- Fallback catalog: \`${CATALOG}\` (exists: ${existsSync(CATALOG)})`,
      existsSync(CATALOG) ? `- Catalog SHA-256: \`${sha256File(CATALOG)}\`` : "",
      "",
      "## Extraction mode",
      "- Mode: **catalog-bootstrap** (public metadata only)",
      "- Full manuscript bodies were **not** extracted from DOCX",
      "- Protected content was **not** written to `public/`",
      "",
      "## Chapter files present",
      `- Count: ${chapterFiles.length}`,
      "",
      "## Stop condition",
      "Place the authoritative DOCX at `/mnt/data/DASTOR Complete Field Manual FULL 3(1).docx` and re-run `npm run extract`.",
    );
  } else {
    const hash = sha256File(docx);
    report.push(`- Authoritative DOCX: \`${docx}\``, `- SHA-256: \`${hash}\``, "");
    report.push(
      "## Extraction mode",
      "- Mode: **docx** (parser hook)",
      "- NOTE: mammoth/docx parser packages install with package.install approval; structure validation uses existing chapter JSON until parser runs.",
      `- Existing normalized chapters: ${chapterFiles.length}`,
    );
    writeFileSync(
      join(ROOT, ".receipts", `extract-${Date.now()}.json`),
      JSON.stringify(
        {
          receiptVersion: "DASTOR-BUILD-1.0",
          timestamp: new Date().toISOString(),
          actor: "ollama-compute-cell",
          action: "source.extract",
          target: docx,
          sourceHash: hash,
          decision: "ALLOW",
          result: "docx_located",
          evidence: [],
        },
        null,
        2,
      ),
    );
  }

  writeFileSync(join(ROOT, "reports/content-extraction-report.md"), report.filter(Boolean).join("\n") + "\n");
  console.log("Wrote reports/content-extraction-report.md");
}

main();
