import { useMemo, useState, useEffect } from "react";
import type { DastorChapter, DastorPart } from "@/types/dastor";

type Props = {
  chapters: DastorChapter[];
  parts: DastorPart[];
  layers: string[];
  frameworks: string[];
  risks: string[];
};

function readParams() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    q: p.get("q") ?? "",
    part: p.get("part") ?? "",
    layer: p.get("layer") ?? "",
    framework: p.get("framework") ?? "",
    risk: p.get("risk") ?? "",
  };
}

export default function ChapterExplorer({ chapters, parts, layers, frameworks, risks }: Props) {
  const initial = readParams();
  const [q, setQ] = useState(initial.q ?? "");
  const [part, setPart] = useState(initial.part ?? "");
  const [layer, setLayer] = useState(initial.layer ?? "");
  const [framework, setFramework] = useState(initial.framework ?? "");
  const [risk, setRisk] = useState(initial.risk ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      setUnlocked(localStorage.getItem("dastor_unlocked") === "1");
    } catch {
      setUnlocked(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (part) params.set("part", part);
    if (layer) params.set("layer", layer);
    if (framework) params.set("framework", framework);
    if (risk) params.set("risk", risk);
    const qs = params.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState({}, "", url);
  }, [q, part, layer, framework, risk]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return chapters.filter((c) => {
      if (part && String(c.partNumber) !== part) return false;
      if (layer && !c.executionLayers.includes(layer)) return false;
      if (framework && !c.frameworks.includes(framework)) return false;
      if (risk && c.vulnerabilityClass !== risk) return false;
      if (!query) return true;
      const hay = [c.title, c.executiveSummary, c.thesis, c.partTitle, ...c.frameworks, ...c.executionLayers]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [chapters, q, part, layer, framework, risk]);

  const coverage = useMemo(() => {
    // Public excerpts are always visible; "sealed" density rises for unpaid readers.
    const sealed = unlocked ? 0 : Math.round(chapters.length * 0.72);
    const open = chapters.length - sealed;
    const pct = chapters.length ? Math.round((open / chapters.length) * 100) : 0;
    return { sealed, open, pct };
  }, [chapters.length, unlocked]);

  const clear = () => {
    setQ("");
    setPart("");
    setLayer("");
    setFramework("");
    setRisk("");
  };

  return (
    <div className="explorer">
      <div className="coverage" aria-live="polite">
        <div className="coverage-bar" style={{ ["--pct" as string]: `${coverage.pct}%` }}>
          <span />
        </div>
        <p className="meta">
          {`${chapters.length} chapters in the public IEG Field Manual index. Open any chapter without an account.`}
        </p>
      </div>
      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Search chapters</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search public chapter metadata"
            aria-label="Search chapters"
          />
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => setFiltersOpen((v) => !v)}>
          {filtersOpen ? "Hide filters" : "Filters"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={clear}>
          Clear
        </button>
        <p className="meta count" aria-live="polite">
          {filtered.length} / {chapters.length}
        </p>
      </div>

      <div className={`filters ${filtersOpen ? "open" : ""}`} hidden={!filtersOpen && typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches ? true : false}>
        <label>
          Part
          <select value={part} onChange={(e) => setPart(e.target.value)}>
            <option value="">All parts</option>
            {parts.map((p) => (
              <option key={p.number} value={String(p.number)}>
                Part {p.number}: {p.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Execution layer
          <select value={layer} onChange={(e) => setLayer(e.target.value)}>
            <option value="">All layers</option>
            {layers.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Framework
          <select value={framework} onChange={(e) => setFramework(e.target.value)}>
            <option value="">All frameworks</option>
            {frameworks.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label>
          Risk type
          <select value={risk} onChange={(e) => setRisk(e.target.value)}>
            <option value="">All risk types</option>
            {risks.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ol className="rows">
        {filtered.map((c) => (
          <li key={c.slug}>
            <a href={`/chapters/${c.slug}`}>
              <span className="num">{String(c.number).padStart(2, "0")}</span>
              <span className="body">
                <strong>{c.title}</strong>
                <span className="thesis">{c.thesis ?? c.executiveSummary}</span>
                <span className="tags">
                  <span>Part {c.partNumber}</span>
                  {c.executionLayers.slice(0, 2).map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </span>
              </span>
              <span className="action">Overview</span>
            </a>
          </li>
        ))}
      </ol>

      <style>{`
        .explorer { color: var(--dastor-ink); }
        .coverage { margin-bottom: 1rem; }
        .coverage-bar {
          height: 4px; background: rgba(14,15,15,.12); margin-bottom: .5rem;
        }
        .coverage-bar span {
          display:block; height:100%; width: var(--pct, 28%); background: var(--dastor-signal);
        }
        .toolbar { display:flex; flex-wrap:wrap; gap:.75rem; align-items:center; margin-bottom:1rem; }
        .search { flex: 1 1 16rem; }
        .search input, .filters select {
          width:100%; min-height:44px; padding:.65rem .8rem;
          border:1px solid var(--dastor-line-dark); background:#fff; font: inherit;
        }
        .filters { display:grid; gap:1rem; grid-template-columns:repeat(4,1fr); margin-bottom:1.25rem; }
        .filters label { display:flex; flex-direction:column; gap:.35rem; font-family:var(--font-mono); font-size:.7rem; letter-spacing:.08em; text-transform:uppercase; }
        .count { margin-left:auto; }
        .rows { list-style:none; margin:0; padding:0; border-top:1px solid var(--dastor-line-dark); }
        .rows a {
          display:grid; grid-template-columns: 3.5rem 1fr auto; gap:1rem; align-items:start;
          padding:1rem 0; border-bottom:1px solid var(--dastor-line-dark); text-decoration:none; color:inherit;
        }
        .num, .action { font-family:var(--font-mono); font-size:.75rem; letter-spacing:.08em; text-transform:uppercase; }
        .thesis { display:block; margin:.35rem 0; color:#4a463f; max-width:70ch; }
        .tags { display:flex; flex-wrap:wrap; gap:.5rem; }
        .tags span { font-family:var(--font-mono); font-size:.65rem; letter-spacing:.08em; text-transform:uppercase; color:#6a655c; }
        .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }
        @media (max-width: 860px) {
          .filters { grid-template-columns:1fr 1fr; }
          .filters:not(.open) { display:none; }
          .rows a { grid-template-columns: 2.75rem 1fr; }
          .action { display:none; }
        }
      `}</style>
    </div>
  );
}
