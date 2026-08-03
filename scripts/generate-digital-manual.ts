#!/usr/bin/env npx tsx
/**
 * Compile the Instant Access digital field manual from the live website chapter
 * catalog + Execution Stack field-guide content so the downloadable MD/PDF matches
 * what dastor.blocksifr.com publishes.
 */
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

type Chapter = {
  slug: string;
  number: number;
  title: string;
  partNumber: number;
  partTitle: string;
  executiveSummary: string;
  thesis?: string;
  scenario?: string;
  exploitPaths?: Array<{ title: string; content: string }>;
  rootCauses?: Array<{ title: string; content: string }>;
  impacts?: { financial?: string; operational?: string; compliance?: string };
  countermeasureGroups?: Array<{ title: string; controls: Array<{ text: string }> }>;
  detectionGuidance?: string[];
  remediationPlaybook?: Array<{ text: string }>;
  frameworks?: string[];
  executionLayers?: string[];
};

type StackLayer = {
  id: string;
  number: number;
  name: string;
  purpose: string;
  trustBoundaries: string[];
  attackSurfaces: string[];
  failureModes: string[];
  propagationPaths: string[];
  consequences: string[];
  countermeasures: {
    prevent: string[];
    detect: string[];
    contain: string[];
    recover: string[];
    verify: string[];
  };
  exampleScenario: {
    initialCondition: string;
    failureOrAttack: string;
    propagation: string;
    consequence: string;
    countermeasure: string;
    validation: string;
  };
};

function loadChapters(): Chapter[] {
  const dir = join(ROOT, "src/content/chapters");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as Chapter)
    .sort((a, b) => a.number - b.number);
}

function loadStack(): StackLayer[] {
  return JSON.parse(readFileSync(join(ROOT, "src/content/config/execution-stack.json"), "utf8")) as StackLayer[];
}

function bullets(items: string[] | undefined, indent = ""): string {
  if (!items?.length) return `${indent}_None listed._\n`;
  return items.map((i) => `${indent}- ${i}`).join("\n") + "\n";
}

function renderChapter(c: Chapter): string {
  const lines: string[] = [];
  lines.push(`# Chapter ${c.number}. ${c.title}`);
  lines.push("");
  lines.push(`*Part ${c.partNumber}: ${c.partTitle}*`);
  lines.push("");
  lines.push("## Executive summary");
  lines.push("");
  lines.push(c.executiveSummary || "");
  lines.push("");
  if (c.thesis) {
    lines.push("## Thesis");
    lines.push("");
    lines.push(c.thesis);
    lines.push("");
  }
  if (c.scenario) {
    lines.push("## Scenario");
    lines.push("");
    lines.push(c.scenario);
    lines.push("");
  }
  if (c.exploitPaths?.length) {
    lines.push("## Exploit paths");
    lines.push("");
    for (const p of c.exploitPaths) {
      lines.push(`### ${p.title}`);
      lines.push("");
      lines.push(p.content);
      lines.push("");
    }
  }
  if (c.rootCauses?.length) {
    lines.push("## Root causes");
    lines.push("");
    for (const p of c.rootCauses) {
      lines.push(`### ${p.title}`);
      lines.push("");
      lines.push(p.content);
      lines.push("");
    }
  }
  if (c.impacts && (c.impacts.financial || c.impacts.operational || c.impacts.compliance)) {
    lines.push("## Impacts");
    lines.push("");
    if (c.impacts.financial) lines.push(`- **Financial:** ${c.impacts.financial}`);
    if (c.impacts.operational) lines.push(`- **Operational:** ${c.impacts.operational}`);
    if (c.impacts.compliance) lines.push(`- **Compliance:** ${c.impacts.compliance}`);
    lines.push("");
  }
  if (c.countermeasureGroups?.length) {
    lines.push("## Countermeasures");
    lines.push("");
    for (const g of c.countermeasureGroups) {
      lines.push(`### ${g.title}`);
      lines.push("");
      for (const ctrl of g.controls || []) lines.push(`- ${ctrl.text}`);
      lines.push("");
    }
  }
  if (c.detectionGuidance?.length) {
    lines.push("## Detection guidance");
    lines.push("");
    lines.push(bullets(c.detectionGuidance));
  }
  if (c.remediationPlaybook?.length) {
    lines.push("## Remediation playbook");
    lines.push("");
    c.remediationPlaybook.forEach((s, i) => lines.push(`${i + 1}. ${s.text}`));
    lines.push("");
  }
  if (c.frameworks?.length || c.executionLayers?.length) {
    lines.push("## Mapping");
    lines.push("");
    if (c.frameworks?.length) lines.push(`- Frameworks: ${c.frameworks.join(", ")}`);
    if (c.executionLayers?.length) lines.push(`- Execution layers: ${c.executionLayers.join(", ")}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

function renderStack(layers: StackLayer[]): string {
  const lines: string[] = [];
  lines.push("# Appendix A. Execution Stack — Attack Path and Countermeasure Field Guide");
  lines.push("");
  lines.push(
    "Compiled from the interactive Execution Stack on dastor.blocksifr.com. Inspect each layer in Normal Operation, Attack Path, and Countermeasures modes online.",
  );
  lines.push("");
  lines.push("Canonical stack:");
  lines.push("");
  lines.push("```");
  lines.push("Input → Tokenization → Context Assembly → Inference → Planning → Tool Selection → Execution → Memory");
  lines.push("                                                                              └→ Future Context Assembly");
  lines.push("```");
  lines.push("");
  for (const layer of layers.slice().sort((a, b) => a.number - b.number)) {
    lines.push(`## ${String(layer.number).padStart(2, "0")} ${layer.name}`);
    lines.push("");
    lines.push(layer.purpose);
    lines.push("");
    lines.push("### Trust boundaries");
    lines.push("");
    lines.push(bullets(layer.trustBoundaries));
    lines.push("### Attack surface");
    lines.push("");
    lines.push(bullets(layer.attackSurfaces));
    lines.push("### Failure modes");
    lines.push("");
    lines.push(bullets(layer.failureModes));
    lines.push("### Propagation");
    lines.push("");
    lines.push(bullets(layer.propagationPaths));
    lines.push("### Consequences");
    lines.push("");
    lines.push(bullets(layer.consequences));
    lines.push("### Countermeasures");
    lines.push("");
    for (const cls of ["prevent", "detect", "contain", "recover", "verify"] as const) {
      lines.push(`**${cls[0].toUpperCase()}${cls.slice(1)}**`);
      lines.push("");
      lines.push(bullets(layer.countermeasures[cls]));
    }
    const s = layer.exampleScenario;
    if (s) {
      lines.push("### Example scenario");
      lines.push("");
      lines.push(`- **Initial condition:** ${s.initialCondition}`);
      lines.push(`- **Attack or failure:** ${s.failureOrAttack}`);
      lines.push(`- **Propagation:** ${s.propagation}`);
      lines.push(`- **Consequence:** ${s.consequence}`);
      lines.push(`- **Countermeasure:** ${s.countermeasure}`);
      lines.push(`- **Validation:** ${s.validation}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  const chapters = loadChapters();
  const stack = loadStack();
  const generatedAt = new Date().toISOString();

  const toc = chapters
    .map((c) => `${c.number}. ${c.title} (Part ${c.partNumber}: ${c.partTitle})`)
    .concat(["A. Execution Stack — Attack Path and Countermeasure Field Guide"])
    .join("\n");

  const body = chapters.map(renderChapter).join("\n") + renderStack(stack);

  const md = `# DASTOR Digital Field Manual

*Digital edition compiled from the verified public chapter catalog and Execution Stack field guide on dastor.blocksifr.com for Instant Access purchasers.*

Governing thesis: AI systems do not fail loudly. They fail quietly, and still act.

Generated: ${generatedAt}  
Source chapters: ${chapters.length}  
Publisher: BlockSiFr LLC

## Contents

${toc}

---

${body}

## Attribution

DASTOR is an AI security and countermeasures publication by BlockSiFr.
`;

  const outDir = join(ROOT, "api/assets");
  mkdirSync(outDir, { recursive: true });
  const mdPath = join(outDir, "dastor-field-manual-digital.md");
  writeFileSync(mdPath, md);
  mkdirSync(join(ROOT, "storage/protected"), { recursive: true });
  writeFileSync(join(ROOT, "storage/protected/dastor-field-manual-digital.md"), md);
  writeFileSync(
    join(ROOT, "storage/manifests/dastor-field-manual-digital.json"),
    JSON.stringify(
      {
        resourceId: "dastor-field-manual-digital",
        generatedAt,
        chapterCount: chapters.length,
        includesExecutionStackAppendix: true,
        source: "src/content/chapters + src/content/config/execution-stack.json",
        paths: [
          "api/assets/dastor-field-manual-digital.md",
          "storage/protected/dastor-field-manual-digital.md",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Wrote ${mdPath} (${md.length} bytes, ${chapters.length} chapters + stack appendix)`);
}

main();
