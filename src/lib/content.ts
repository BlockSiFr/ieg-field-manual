import type { DastorChapter, DastorPart, PublicationMeta, ExecutionStackLayer } from "@/types/dastor";
import publication from "@/content/config/publication.json";
import stack from "@/content/config/execution-stack.json";

const chapterModules = import.meta.glob("../content/chapters/*.json", { eager: true }) as Record<
  string,
  { default: DastorChapter }
>;
const partModules = import.meta.glob("../content/parts/*.json", { eager: true }) as Record<
  string,
  { default: DastorPart }
>;

export function getPublication(): PublicationMeta {
  return publication as PublicationMeta;
}

export function getParts(): DastorPart[] {
  return Object.values(partModules)
    .map((m) => m.default)
    .sort((a, b) => a.number - b.number);
}

export function getChapters(): DastorChapter[] {
  return Object.values(chapterModules)
    .map((m) => m.default)
    .sort((a, b) => a.number - b.number);
}

export function getChapter(slug: string): DastorChapter | undefined {
  return getChapters().find((c) => c.slug === slug);
}

export function getRelatedChapters(chapter: DastorChapter, limit = 3): DastorChapter[] {
  return getChapters()
    .filter(
      (c) =>
        c.slug !== chapter.slug &&
        (c.partNumber === chapter.partNumber ||
          c.executionLayers.some((l) => chapter.executionLayers.includes(l))),
    )
    .slice(0, limit);
}

export function getExecutionStack(): ExecutionStackLayer[] {
  return (stack as ExecutionStackLayer[]).slice().sort((a, b) => a.number - b.number);
}

export function filterChapters(params: {
  q?: string;
  part?: string;
  layer?: string;
  framework?: string;
  risk?: string;
}): DastorChapter[] {
  const q = params.q?.trim().toLowerCase();
  return getChapters().filter((c) => {
    if (params.part && String(c.partNumber) !== params.part) return false;
    if (params.layer && !c.executionLayers.includes(params.layer)) return false;
    if (params.framework && !c.frameworks.includes(params.framework)) return false;
    if (params.risk && c.vulnerabilityClass !== params.risk) return false;
    if (!q) return true;
    const hay = [c.title, c.executiveSummary, c.thesis, c.partTitle, ...c.frameworks, ...c.executionLayers]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
