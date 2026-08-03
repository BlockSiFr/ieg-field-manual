import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import type { ExecutionStackLayer, InspectionMode, Severity } from "@/types/dastor";
import { track } from "@/lib/analytics";

type Props = { layers: ExecutionStackLayer[] };

const MODES: { id: InspectionMode; label: string }[] = [
  { id: "normal", label: "Normal Operation" },
  { id: "attack", label: "Attack Path" },
  { id: "countermeasures", label: "Countermeasures" },
];

const SEVERITY_LABEL: Record<Severity, string> = {
  informational: "Informational",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};

function parseHash(): { layerId?: string; mode?: InspectionMode } {
  if (typeof window === "undefined") return {};
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return {};
  const [layerId, modePart] = raw.split("/");
  const mode =
    modePart === "attack" || modePart === "countermeasures" || modePart === "normal"
      ? modePart
      : undefined;
  return { layerId: layerId || undefined, mode };
}

function writeHash(layerId: string, mode: InspectionMode) {
  const next = `#${layerId}/${mode}`;
  if (window.location.hash !== next) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
  }
}

function List({ items }: { items: string[] }) {
  if (!items?.length) return <p className="empty">None listed.</p>;
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="block">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function ExecutionStackExplorer({ layers }: Props) {
  const initial = useMemo(() => parseHash(), []);
  const [active, setActive] = useState(initial.layerId && layers.some((l) => l.id === initial.layerId) ? initial.layerId : layers[0]?.id ?? "input");
  const [mode, setMode] = useState<InspectionMode>(initial.mode ?? "normal");
  const current = layers.find((l) => l.id === active) ?? layers[0];
  const activeIndex = layers.findIndex((l) => l.id === active);

  useEffect(() => {
    if (!current) return;
    writeHash(current.id, mode);
    track("dastor_stack_layer_selected", { layer: current.id, mode });
  }, [current, mode]);

  useEffect(() => {
    const onHash = () => {
      const parsed = parseHash();
      if (parsed.layerId && layers.some((l) => l.id === parsed.layerId)) setActive(parsed.layerId);
      if (parsed.mode) setMode(parsed.mode);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [layers]);

  if (!current) return null;

  const onKeyNav = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = layers.findIndex((l) => l.id === active);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = layers[(idx + 1) % layers.length];
      if (next) setActive(next.id);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = layers[(idx - 1 + layers.length) % layers.length];
      if (prev) setActive(prev.id);
    }
  };

  const cm = current.countermeasures;
  const scenario = current.exampleScenario;

  return (
    <div className="stack-explorer" onKeyDown={onKeyNav}>
      <div className="flow" aria-label="Execution stack flow">
        <ol>
          {layers.map((layer, i) => {
            const selected = layer.id === active;
            return (
              <li key={layer.id} className={selected ? "current" : i < activeIndex ? "upstream" : "downstream"}>
                <button type="button" onClick={() => setActive(layer.id)} aria-current={selected ? "step" : undefined}>
                  <span className="fn">{String(layer.number).padStart(2, "0")}</span>
                  <span>{layer.name}</span>
                </button>
                {i < layers.length - 1 ? <span className="arrow" aria-hidden="true">↓</span> : null}
              </li>
            );
          })}
          <li className="feedback">
            <span className="arrow" aria-hidden="true">└──────────────→</span>
            <span>Future Context Assembly</span>
          </li>
        </ol>
        <p className="flow-note">Memory is a feedback loop: durable state re-enters context on later runs.</p>
      </div>

      <div
        className="modes"
        role="tablist"
        aria-label="Inspection mode"
      >
        {MODES.map((m) => {
          const selected = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              id={`mode-${m.id}`}
              aria-selected={selected}
              aria-controls={`panel-${current.id}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? "active" : ""}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="stack-body">
        <div className="rail" role="tablist" aria-label="AI execution stack layers">
          {layers.map((layer) => {
            const selected = layer.id === active;
            return (
              <button
                key={layer.id}
                type="button"
                role="tab"
                id={`tab-${layer.id}`}
                aria-selected={selected}
                aria-controls={`panel-${layer.id}`}
                tabIndex={selected ? 0 : -1}
                className={selected ? "active" : ""}
                onClick={() => setActive(layer.id)}
              >
                <span className="n">{String(layer.number).padStart(2, "0")}</span>
                <span className="name">{layer.name}</span>
              </button>
            );
          })}
        </div>

        <div
          className="panel"
          role="tabpanel"
          id={`panel-${current.id}`}
          aria-labelledby={`tab-${current.id}`}
        >
          <div className="panel-head">
            <p className="meta">Layer {String(current.number).padStart(2, "0")}</p>
            <p className={`severity sev-${current.severity}`} title="Residual severity if this layer is compromised">
              {SEVERITY_LABEL[current.severity]}
            </p>
          </div>
          <h2>{current.name}</h2>
          <p className="purpose">{current.purpose}</p>
          <p className="mode-label">
            Viewing: <strong>{MODES.find((m) => m.id === mode)?.label}</strong>
          </p>

          {mode === "normal" ? (
            <>
              <Section title="Purpose"><p>{current.purpose}</p></Section>
              <Section title="Inputs"><List items={current.inputs} /></Section>
              <Section title="Processing"><List items={current.processing} /></Section>
              <Section title="Outputs"><List items={current.outputs} /></Section>
              <Section title="Dependencies"><List items={current.dependencies} /></Section>
              <Section title="Trust boundary"><List items={current.trustBoundaries} /></Section>
            </>
          ) : null}

          {mode === "attack" ? (
            <>
              <Section title="Threat actors"><List items={current.threatActors} /></Section>
              <Section title="Attack surface"><List items={current.attackSurfaces} /></Section>
              <Section title="Failure modes"><List items={current.failureModes} /></Section>
              <Section title="Propagation path"><List items={current.propagationPaths} /></Section>
              <Section title="Consequences"><List items={current.consequences} /></Section>
              {scenario ? (
                <Section title="Example attack scenario">
                  <dl className="scenario">
                    <div><dt>Initial condition</dt><dd>{scenario.initialCondition}</dd></div>
                    <div><dt>Attack or failure</dt><dd>{scenario.failureOrAttack}</dd></div>
                    <div><dt>Downstream propagation</dt><dd>{scenario.propagation}</dd></div>
                    <div><dt>Potential consequence</dt><dd>{scenario.consequence}</dd></div>
                    <div><dt>Recommended countermeasure</dt><dd>{scenario.countermeasure}</dd></div>
                    <div><dt>Validation evidence</dt><dd>{scenario.validation}</dd></div>
                  </dl>
                </Section>
              ) : null}
            </>
          ) : null}

          {mode === "countermeasures" ? (
            <>
              <Section title="Prevent">
                <p className="class-tag">Prevent</p>
                <List items={cm.prevent} />
              </Section>
              <Section title="Detect">
                <p className="class-tag">Detect</p>
                <List items={cm.detect} />
              </Section>
              <Section title="Contain">
                <p className="class-tag">Contain</p>
                <List items={cm.contain} />
              </Section>
              <Section title="Recover">
                <p className="class-tag">Recover</p>
                <List items={cm.recover} />
              </Section>
              <Section title="Verify">
                <p className="class-tag">Verify</p>
                <List items={cm.verify} />
              </Section>
              <Section title="Residual risk"><List items={current.residualRisk} /></Section>
              {current.id === "execution" || current.id === "planning" || current.id === "tool-selection" || current.id === "memory" ? (
                <Section title="Trust-before-execution">
                  <p>
                    At this layer, prove identity, action, resource, and policy before side effects or durable writes.
                    An execution receipt can record who acted, what was requested, which authority applied, the decision
                    (allow, constrain, escalate, deny), trust and risk conditions, timing, and whether evidence was
                    cryptographically protected. Treat receipts as verification evidence — not as a product pitch.
                  </p>
                </Section>
              ) : null}
            </>
          ) : null}

          <Section title="Related chapters">
            <ul>
              {current.relatedChapterSlugs.map((slug) => (
                <li key={slug}>
                  <a href={`/chapters/${slug}`}>{slug.replace(/-/g, " ")}</a>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <style>{`
        .stack-explorer {
          display:grid; gap:1.5rem;
          color: var(--dastor-text-light);
        }
        .flow {
          border:1px solid var(--dastor-line-light);
          padding:1rem 1.1rem;
          /* Keep the page grid readable through the frame */
          background: color-mix(in srgb, var(--dastor-carbon) 78%, transparent);
        }
        .flow ol { list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; gap:.35rem .75rem; align-items:center; }
        .flow li { display:flex; align-items:center; gap:.45rem; }
        .flow button {
          background:transparent; color:inherit; border:1px solid var(--dastor-line-light);
          min-height:40px; padding:.4rem .7rem; cursor:pointer; display:inline-flex; gap:.45rem; align-items:center;
          font: inherit;
        }
        .flow li.current button { border-color: var(--dastor-signal); }
        .flow .fn { font-family:var(--font-mono); font-size:.65rem; letter-spacing:.12em; color:var(--dastor-text-muted); }
        .flow .arrow { font-family:var(--font-mono); color:var(--dastor-text-muted); font-size:.8rem; }
        .flow .feedback { width:100%; margin-top:.35rem; color:var(--dastor-paper-muted); font-size:.9rem; }
        .flow-note { margin:.75rem 0 0; color:var(--dastor-text-muted); font-size:.85rem; }
        .modes { display:flex; flex-wrap:wrap; gap:.4rem; }
        .modes button {
          background:transparent; color:inherit; border:1px solid var(--dastor-line-light);
          min-height:44px; padding:.55rem .9rem; cursor:pointer;
          font-family:var(--font-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase;
        }
        .modes button.active, .modes button:hover { border-color: var(--dastor-signal); }
        .stack-body { display:grid; gap:1.5rem; grid-template-columns: 16rem 1fr; }
        .rail { display:flex; flex-direction:column; gap:.35rem; }
        .rail button {
          text-align:left; background:transparent; color:inherit; border:1px solid var(--dastor-line-light);
          min-height:48px; padding:.75rem .9rem; cursor:pointer; display:flex; flex-direction:column; gap:.2rem;
        }
        .rail button.active, .rail button:hover { border-color: var(--dastor-signal); }
        .n { font-family:var(--font-mono); font-size:.7rem; letter-spacing:.12em; color:var(--dastor-text-muted); }
        .name { font-family:var(--font-display); text-transform:uppercase; letter-spacing:.04em; font-size:1.1rem; }
        .panel {
          border:1px solid var(--dastor-line-light);
          padding:1.5rem;
          background: color-mix(in srgb, var(--dastor-carbon) 88%, transparent);
        }
        .rail button, .modes button, .flow button {
          background: color-mix(in srgb, var(--dastor-ink) 55%, transparent);
        }
        .panel-head { display:flex; justify-content:space-between; gap:1rem; align-items:baseline; }
        .panel h2 { font-family:var(--font-display); text-transform:uppercase; font-size:2rem; margin:.25rem 0 .75rem; }
        .purpose { margin:0 0 1rem; max-width:70ch; }
        .mode-label { font-family:var(--font-mono); font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--dastor-text-muted); margin-bottom:1.25rem; }
        .severity {
          font-family:var(--font-mono); font-size:.68rem; letter-spacing:.1em; text-transform:uppercase;
          border:1px solid var(--dastor-line-light); padding:.25rem .5rem; color:var(--dastor-paper-muted);
        }
        .block { margin:0 0 1.25rem; padding-bottom:1rem; border-bottom:1px solid var(--dastor-line-light); }
        .block:last-child { border-bottom:0; margin-bottom:0; }
        .block h3 {
          font-family:var(--font-mono); font-size:.7rem; letter-spacing:.1em; text-transform:uppercase;
          color:var(--dastor-text-muted); margin:0 0 .45rem; font-weight:500;
        }
        .class-tag {
          display:inline-block; font-family:var(--font-mono); font-size:.65rem; letter-spacing:.1em;
          text-transform:uppercase; border:1px solid var(--dastor-line-light); padding:.15rem .4rem; margin:0 0 .5rem;
        }
        ul { margin:.35rem 0 0; padding-left:1.1rem; }
        .empty { margin:0; color:var(--dastor-text-muted); }
        .scenario { display:grid; gap:.85rem; margin:0; }
        .scenario dt { font-family:var(--font-mono); font-size:.68rem; letter-spacing:.08em; text-transform:uppercase; color:var(--dastor-text-muted); }
        .scenario dd { margin:.25rem 0 0; }
        a { color: var(--dastor-paper); }
        @media (max-width: 860px) {
          .stack-body { grid-template-columns: 1fr; }
          .rail { display:grid; grid-template-columns: 1fr 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .stack-explorer * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}
