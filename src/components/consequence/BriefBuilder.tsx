import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import {
  briefAsMarkdown,
  emptyDraft,
  evidenceLabels,
  examples,
  fieldGuidance,
  missingFields,
  readinessLabel,
  sectorLabels,
  sectorQuestions,
  type ConsequenceDraft,
  type ConsequenceSector,
  type EvidenceState,
} from "@/lib/consequenceBrief";

const sectors: ConsequenceSector[] = ["security", "ai", "infrastructure", "change"];
const evidenceStates: EvidenceState[] = ["hypothesis", "modeled", "observed", "independently_verified"];

export default function BriefBuilder() {
  const [draft, setDraft] = useState<ConsequenceDraft>(() => emptyDraft());
  const [notice, setNotice] = useState("");
  const started = useRef(false);

  useEffect(() => {
    const sector = new URLSearchParams(window.location.search).get("scenario");
    if (sector && sectors.includes(sector as ConsequenceSector)) {
      setDraft(emptyDraft(sector as ConsequenceSector));
    }
  }, []);

  function change(key: keyof ConsequenceDraft, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setNotice("");
    if (!started.current) {
      started.current = true;
      track("dastor_brief_started", { sector: draft.sector });
    }
  }

  function chooseSector(sector: ConsequenceSector) {
    setDraft(emptyDraft(sector));
    setNotice("Started a blank " + sectorLabels[sector].toLowerCase() + " brief.");
    started.current = false;
  }

  function loadExample() {
    setDraft({ ...examples[draft.sector] });
    setNotice("Illustrative scenario loaded. This is not a real finding or customer case.");
    track("dastor_brief_example_loaded", { sector: draft.sector });
  }

  function copyBrief() {
    const content = briefAsMarkdown(draft);
    if (!navigator.clipboard?.writeText) {
      setNotice("Clipboard access is unavailable. Use Download Markdown instead.");
      return;
    }
    navigator.clipboard.writeText(content)
      .then(() => {
        setNotice("Brief copied. Review its claims before sharing.");
        track("dastor_brief_copied", { sector: draft.sector, evidence_state: draft.evidenceState });
      })
      .catch(() => setNotice("Could not access clipboard. Download the Markdown file instead."));
  }

  function downloadBrief() {
    const text = briefAsMarkdown(draft);
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "blocksifr-consequence-brief.md";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Markdown brief downloaded. It remains your own draft and is not independently verified.");
    track("dastor_brief_downloaded", { sector: draft.sector, evidence_state: draft.evidenceState });
  }

  async function shareTool() {
    // Share the public tool only, never the user's case contents.
    const url = "https://ieg.blocksifr.com/brief?scenario=" + encodeURIComponent(draft.sector);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Build a Consequence Brief", text: "Free, private consequence analysis worksheet from BlockSiFr.", url });
        track("dastor_brief_tool_shared", { sector: draft.sector });
      } catch {
        setNotice("Sharing cancelled or unavailable. Your draft was not transmitted.");
      }
    } else if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        setNotice("Link to the public tool copied. Your draft was not included.");
        track("dastor_brief_tool_shared", { sector: draft.sector });
      } catch {
        setNotice("Sharing unavailable. Copy the page URL directly.");
      }
    } else {
      setNotice("Sharing unavailable. Copy the page URL directly.");
    }
  }

  const gaps = missingFields(draft);
  const guide = fieldGuidance[draft.sector];

  return (
    <div className="brief-app">
      <div className="brief-app-top">
        <div>
          <p className="eyebrow">Free practical tool / No login</p>
          <h2>Build a one-page Consequence Brief</h2>
          <p>Turn a technical signal or proposed decision into a structured, challengeable account of what could happen and how to establish the facts.</p>
        </div>
        <div className="brief-privacy">
          <strong>Private by design</strong>
          <span>Your entries stay in this browser session. No case text is sent to BlockSiFr, placed in a URL, or saved by this tool. Do not enter secrets or personal data.</span>
        </div>
      </div>

      <fieldset className="brief-sector-set">
        <legend>1. Select the kind of consequence</legend>
        <div className="brief-sector-grid">
          {sectors.map((sector) => (
            <button
              key={sector}
              type="button"
              aria-pressed={draft.sector === sector}
              className={draft.sector === sector ? "brief-sector active" : "brief-sector"}
              onClick={() => chooseSector(sector)}
            >{sectorLabels[sector]}</button>
          ))}
        </div>
      </fieldset>

      <div className="brief-body">
        <form className="brief-fields" onSubmit={(event) => event.preventDefault()}>
          <div className="brief-intro-row">
            <div>
              <h3>2. Describe the causal path</h3>
              <p className="brief-question">{sectorQuestions[draft.sector]}</p>
            </div>
            <button className="brief-text-button" type="button" onClick={loadExample}>Load illustrative example</button>
          </div>
          <label>
            Case title
            <input maxLength={140} value={draft.title} onChange={(e) => change("title", e.target.value)} placeholder="Name the question, not the conclusion" />
          </label>
          <label>
            Affected service, asset, or stakeholder
            <textarea rows={2} maxLength={750} value={draft.affected} onChange={(e) => change("affected", e.target.value)} placeholder="What business operation or protected asset could be affected?" />
          </label>
          <label>
            Initiating failure, event, or proposed action
            <textarea rows={2} maxLength={750} value={draft.trigger} onChange={(e) => change("trigger", e.target.value)} placeholder={guide.trigger} />
          </label>
          <label>
            Causal pathway
            <textarea rows={3} maxLength={1400} value={draft.pathway} onChange={(e) => change("pathway", e.target.value)} placeholder="Explain how the event could reach the outcome. Identify every unproven step." />
          </label>
          <label>
            Consequence that matters
            <textarea rows={3} maxLength={1200} value={draft.consequence} onChange={(e) => change("consequence", e.target.value)} placeholder={guide.consequence} />
          </label>
          <label>
            Protected outcome or decision boundary
            <textarea rows={2} maxLength={1000} value={draft.boundary} onChange={(e) => change("boundary", e.target.value)} placeholder={guide.boundary} />
          </label>

          <div className="brief-intro-row brief-second-section">
            <div>
              <h3>3. Make the evidence honest</h3>
              <p>Distinguish the scenario from an actual test, measured result, or independently confirmed finding.</p>
            </div>
          </div>
          <label>
            Current evidence state
            <select value={draft.evidenceState} onChange={(e) => change("evidenceState", e.target.value)}>
              {evidenceStates.map((state) => <option key={state} value={state}>{evidenceLabels[state]}</option>)}
            </select>
          </label>
          <label>
            Evidence available and its limitations
            <textarea rows={3} maxLength={1200} value={draft.evidence} onChange={(e) => change("evidence", e.target.value)} placeholder="What was actually observed, tested, measured, or reviewed? Cite artifacts locally in your export." />
          </label>
          <label>
            Unknowns, counterarguments, and exclusions
            <textarea rows={2} maxLength={1000} value={draft.uncertainty} onChange={(e) => change("uncertainty", e.target.value)} placeholder="What facts would defeat the hypothesis? What is not in scope?" />
          </label>
          <label>
            Next authorized validation or protective action
            <textarea rows={2} maxLength={900} value={draft.mitigation} onChange={(e) => change("mitigation", e.target.value)} placeholder="Specify a safe test or a concrete decision, without assuming permission to probe a system." />
          </label>
        </form>

        <aside className="brief-output" aria-label="Draft readiness and export">
          <p className="eyebrow">Live decision summary</p>
          <h3>{readinessLabel(draft)}</h3>
          <p className="brief-outcome">{draft.consequence.trim() || "Describe the potential consequence to show the decision question here."}</p>
          <div className="brief-state"><span>Evidence classification</span><strong>{evidenceLabels[draft.evidenceState]}</strong></div>
          <div className="brief-state"><span>Unfilled required fields</span><strong>{gaps.length} of 9</strong></div>
          {gaps.length > 0 ? (
            <div className="brief-gaps">
              <h4>Questions still unanswered</h4>
              <ul>{gaps.slice(0, 5).map((gap) => <li key={gap}>{gap}</li>)}</ul>
              {gaps.length > 5 && <p>Plus {gaps.length - 5} more. Your export lists every gap.</p>}
            </div>
          ) : (
            <p className="brief-note">All required fields have text. This does not establish that the claims are correct or verified.</p>
          )}
          <div className="brief-actions">
            <button type="button" className="btn btn-primary" onClick={downloadBrief}>Download Markdown brief</button>
            <button type="button" className="btn btn-ghost" onClick={copyBrief}>Copy brief</button>
            <button type="button" className="btn btn-ghost" onClick={shareTool}>Share the free tool</button>
          </div>
          <p className="brief-feedback" aria-live="polite">{notice}</p>
          <hr />
          <p className="brief-note">Need to test the pathway, evaluate the cost of the consequence, or establish an evidence package?</p>
          <a className="brief-cta" href="/assessment?source=brief" onClick={() => track("dastor_brief_assessment_clicked", { sector: draft.sector })}>Request a scoped consequence assessment</a>
          <p className="brief-fine">A request is not an authorization for active testing. No draft fields are attached to the request.</p>
        </aside>
      </div>
    </div>
  );
}
