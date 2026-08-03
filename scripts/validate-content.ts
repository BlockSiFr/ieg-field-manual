#!/usr/bin/env npx tsx
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const chaptersDir = join(ROOT, "src/content/chapters");
const partsDir = join(ROOT, "src/content/parts");
const expectedChapters = 40;
const expectedParts = 6;

type Issue = { level: "error" | "warn"; code: string; message: string };

function main() {
  mkdirSync(join(ROOT, "reports"), { recursive: true });
  const issues: Issue[] = [];
  const chapterFiles = readdirSync(chaptersDir).filter((f) => f.endsWith(".json"));
  const partFiles = readdirSync(partsDir).filter((f) => f.endsWith(".json"));
  const chapters = chapterFiles.map((f) => JSON.parse(readFileSync(join(chaptersDir, f), "utf8")));
  const parts = partFiles.map((f) => JSON.parse(readFileSync(join(partsDir, f), "utf8")));

  if (chapters.length !== expectedChapters) {
    issues.push({
      level: "error",
      code: "CHAPTER_COUNT",
      message: `Expected ${expectedChapters} chapters, found ${chapters.length}`,
    });
  }
  if (parts.length !== expectedParts) {
    issues.push({
      level: "error",
      code: "PART_COUNT",
      message: `Expected ${expectedParts} parts, found ${parts.length}`,
    });
  }

  const nums = chapters.map((c) => c.number).sort((a, b) => a - b);
  for (let i = 1; i <= expectedChapters; i++) {
    if (!nums.includes(i)) issues.push({ level: "error", code: "MISSING_CHAPTER", message: `Missing chapter ${i}` });
  }

  for (const c of chapters) {
    if (!c.slug || !c.title || !c.executiveSummary) {
      issues.push({ level: "error", code: "INCOMPLETE_PUBLIC", message: `Incomplete public fields: ${c.slug || c.number}` });
    }
    if (c.publicExcerpt !== true) {
      issues.push({ level: "warn", code: "PUBLIC_FLAG", message: `${c.slug} publicExcerpt != true` });
    }
    // Guard: refuse oversized bodies in public chapter JSON (protected leak heuristic)
    const raw = JSON.stringify(c);
    if (raw.length > 12_000) {
      issues.push({
        level: "warn",
        code: "SIZE_HEURISTIC",
        message: `${c.slug} public JSON unusually large (${raw.length} bytes) — review for protected content`,
      });
    }
  }

  const validation = {
    ok: issues.filter((i) => i.level === "error").length === 0,
    expected: { chapters: expectedChapters, parts: expectedParts },
    actual: { chapters: chapters.length, parts: parts.length },
    issues,
    generatedAt: new Date().toISOString(),
    sourceNote:
      "Validated against catalog-bootstrap public metadata. Authoritative DOCX was missing at scaffold time.",
  };
  writeFileSync(join(ROOT, "reports/content-validation-report.json"), JSON.stringify(validation, null, 2) + "\n");

  const map = [
    "# Manual structure map",
    "",
    `Parts: ${parts.length} · Chapters: ${chapters.length}`,
    "",
    ...parts
      .sort((a, b) => a.number - b.number)
      .flatMap((p) => [
        `## Part ${p.number} — ${p.title}`,
        "",
        ...chapters
          .filter((c) => c.partNumber === p.number)
          .sort((a, b) => a.number - b.number)
          .map((c) => `- Ch ${c.number}: ${c.title} (\`${c.slug}\`)`),
        "",
      ]),
  ];
  writeFileSync(join(ROOT, "reports/manual-structure-map.md"), map.join("\n"));
  console.log(JSON.stringify({ ok: validation.ok, issues: issues.length }));
  if (!validation.ok) process.exitCode = 1;
}

main();
