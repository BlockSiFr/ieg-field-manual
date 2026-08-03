/**
 * Resolve gated deliverable files shipped with the Functions app.
 * Azure Blob SAS is preferred when configured; these assets are the reliable fallback
 * so customer downloads never return placeholder text.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, "..", "assets");

const CATALOG = {
  "sample-chapter-1": {
    file: "sample-chapter-1.pdf",
    filename: "DASTOR-Sample-Chapter-1-AI-Is-Not-Software.pdf",
    contentType: "application/pdf",
    access: "gated-lead",
  },
  "sample-chapter-1.md": {
    file: "sample-chapter-1.md",
    filename: "DASTOR-Sample-Chapter-1-AI-Is-Not-Software.md",
    contentType: "text/markdown; charset=utf-8",
    access: "gated-lead",
  },
  "sample-chapter-1.pdf": {
    file: "sample-chapter-1.pdf",
    filename: "DASTOR-Sample-Chapter-1-AI-Is-Not-Software.pdf",
    contentType: "application/pdf",
    access: "gated-lead",
  },
  "framework-mapping": {
    file: "framework-mapping.md",
    filename: "dastor-framework-mapping.md",
    contentType: "text/markdown; charset=utf-8",
    access: "gated-lead",
  },
  "assessment-checklist": {
    file: "assessment-checklist.md",
    filename: "dastor-assessment-checklist.md",
    contentType: "text/markdown; charset=utf-8",
    access: "gated-lead",
  },
  "threat-briefs": {
    file: "threat-briefs.md",
    filename: "dastor-threat-briefs.md",
    contentType: "text/markdown; charset=utf-8",
    access: "gated-lead",
  },
  "dastor-field-manual-digital": {
    file: "dastor-field-manual-digital.pdf",
    filename: "dastor-field-manual-digital.pdf",
    contentType: "application/pdf",
    access: "purchaser",
  },
  "dastor-field-manual-digital.pdf": {
    file: "dastor-field-manual-digital.pdf",
    filename: "dastor-field-manual-digital.pdf",
    contentType: "application/pdf",
    access: "purchaser",
  },
  "dastor-field-manual-digital.md": {
    file: "dastor-field-manual-digital.md",
    filename: "dastor-field-manual-digital.md",
    contentType: "text/markdown; charset=utf-8",
    access: "purchaser",
  },
};

export function normalizeResourceId(resource) {
  return String(resource || "")
    .trim()
    .replace(/^\/+/, "")
    .toLowerCase();
}

export function resolveDeliverable(resource) {
  const id = normalizeResourceId(resource);
  const meta = CATALOG[id];
  if (!meta) return null;
  const path = join(ASSETS, meta.file);
  if (!existsSync(path)) return null;
  return {
    id,
    path,
    filename: meta.filename,
    contentType: meta.contentType,
    access: meta.access,
    body: readFileSync(path, "utf8"),
  };
}

export function listDeliverables() {
  return Object.entries(CATALOG)
    .filter(([k]) => !k.includes("."))
    .map(([id, meta]) => ({ id, ...meta }));
}

/** Stable API download URL used when Azure Blob SAS is unavailable. */
export function localDeliverableUrl(resourceId, ttlMinutes = 30) {
  const id = normalizeResourceId(resourceId);
  const exp = Date.now() + ttlMinutes * 60_000;
  return {
    mode: "local-asset",
    downloadUrl: `/api/resources/download?resource=${encodeURIComponent(id)}&stub=1&exp=${exp}`,
    expiresAt: new Date(exp).toISOString(),
  };
}
