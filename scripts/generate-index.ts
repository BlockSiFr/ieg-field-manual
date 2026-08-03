#!/usr/bin/env npx tsx
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function main() {
  const chapters = readdirSync(join(ROOT, "src/content/chapters"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const raw = readFileSync(join(ROOT, "src/content/chapters", f), "utf8");
      const data = JSON.parse(raw);
      return {
        id: data.slug,
        number: data.number,
        title: data.title,
        partNumber: data.partNumber,
        partTitle: data.partTitle,
        frameworks: data.frameworks,
        executionLayers: data.executionLayers,
        riskTypes: data.riskTypes,
        publicAccess: "public_excerpt",
        contentHash: createHash("sha256").update(raw).digest("hex"),
        headingHierarchy: ["chapter", data.title],
      };
    })
    .sort((a, b) => a.number - b.number);

  mkdirSync(join(ROOT, "storage/manifests"), { recursive: true });
  const indexPath = join(ROOT, "storage/manifests/content-index.json");
  writeFileSync(
    indexPath,
    JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        entries: chapters,
        note: "SQLite optional; JSON index used for portable compute-cell operation. No protected manuscript bodies indexed.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Indexed ${chapters.length} chapters -> ${indexPath}`);
}

main();
