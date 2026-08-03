#!/usr/bin/env npx tsx
/**
 * Publish the authored Chapter 1 practitioner sample into protected storage
 * and api/assets. Does NOT regenerate from thin catalog JSON — that produced
 * the unacceptable stub download.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SOURCE = join(ROOT, "content/samples/sample-chapter-1.md");
const FALLBACK = join(ROOT, "api/assets/sample-chapter-1.md");

function main() {
  const src = existsSync(SOURCE) ? SOURCE : FALLBACK;
  if (!existsSync(src)) {
    throw new Error(`Missing authored sample at ${SOURCE} (or ${FALLBACK})`);
  }
  const body = readFileSync(src, "utf8");
  if (body.length < 4000) {
    throw new Error("Sample chapter looks like a stub (<4KB). Refusing to publish.");
  }
  if (body.includes("generated from the verified public chapter catalog")) {
    throw new Error("Stub disclaimer detected. Refusing to publish catalog stub as sample.");
  }

  mkdirSync(join(ROOT, "storage/protected"), { recursive: true });
  mkdirSync(join(ROOT, "storage/manifests"), { recursive: true });
  mkdirSync(join(ROOT, "api/assets"), { recursive: true });

  const outProtected = join(ROOT, "storage/protected/sample-chapter-1.md");
  const outAsset = join(ROOT, "api/assets/sample-chapter-1.md");
  writeFileSync(outProtected, body, "utf8");
  writeFileSync(outAsset, body, "utf8");

  // Prefer PDF sibling if present
  const pdfSrc = src.replace(/\.md$/, ".pdf");
  if (existsSync(pdfSrc)) {
    copyFileSync(pdfSrc, join(ROOT, "storage/protected/sample-chapter-1.pdf"));
    copyFileSync(pdfSrc, join(ROOT, "api/assets/sample-chapter-1.pdf"));
  }

  writeFileSync(
    join(ROOT, "storage/manifests/sample-chapter-1.json"),
    JSON.stringify(
      {
        resourceId: "sample-chapter-1",
        path: "storage/protected/sample-chapter-1.md",
        pdfPath: existsSync(pdfSrc) ? "storage/protected/sample-chapter-1.pdf" : null,
        publicBundle: false,
        bytes: Buffer.byteLength(body, "utf8"),
        generatedAt: new Date().toISOString(),
        source: src.replace(ROOT + "/", ""),
        qualityGate: "authored-prose-min-4kb",
      },
      null,
      2,
    ) + "\n",
  );

  if (existsSync(join(ROOT, "public/sample-chapter-1.md"))) {
    throw new Error("Protected sample must not exist under public/");
  }
  console.log(`Published authored sample (${body.length} chars) from ${src}`);
}

main();
