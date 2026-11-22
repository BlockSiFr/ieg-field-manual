import { describe, expect, it } from "vitest";
import {
  briefAsMarkdown,
  challengeQuestions,
  emptyDraft,
  examples,
  missingFields,
  readinessLabel,
  sectorLabels,
} from "../../src/lib/consequenceBrief";

describe("Consequence Brief Builder", () => {
  it("starts as an explicit incomplete hypothesis rather than inventing impact", () => {
    const draft = emptyDraft();
    expect(draft.evidenceState).toBe("hypothesis");
    expect(draft.consequence).toBe("");
    expect(missingFields(draft)).toHaveLength(9);
    expect(readinessLabel(draft)).toMatch(/Draft/);
  });

  it("provides an illustrative example for every supported sector", () => {
    for (const key of Object.keys(sectorLabels) as (keyof typeof sectorLabels)[]) {
      expect(examples[key].sector).toBe(key);
      expect(missingFields(examples[key])).toHaveLength(0);
      expect(examples[key].evidenceState).toBe("hypothesis");
      expect(readinessLabel(examples[key])).toMatch(/Hypothesis/);
      expect(examples[key].evidence.toLowerCase()).toMatch(/no|only|scenario|conceptual/);
    }
  });

  it("retains unknowns and evidence caveats in exported Markdown", () => {
    const draft = examples.security;
    const output = briefAsMarkdown(draft);
    expect(output).toContain(draft.pathway);
    expect(output).toContain(draft.uncertainty);
    expect(output).toContain("Hypothesis only");
    expect(output).toContain("not a vulnerability verification");
    expect(output).toContain("https://ieg.blocksifr.com/brief");
    expect(output).not.toContain("Status: Proven");
  });

  it("shows all missing fields in a draft export", () => {
    const output = briefAsMarkdown(emptyDraft("infrastructure"));
    expect(output).toContain("Case title");
    expect(output).toContain("Causal pathway");
    expect(output).toContain("Known uncertainty");
    expect(output).toContain("not supplied");
  });

  it("generates domain-specific falsification questions", () => {
    expect(challengeQuestions(examples.security).join(" ")).toMatch(/defenses/i);
    expect(challengeQuestions(examples.infrastructure).join(" ")).toMatch(/baseline/i);
    expect(challengeQuestions(examples.ai).join(" ")).toMatch(/authority/i);
    expect(challengeQuestions(examples.change).join(" ")).toMatch(/rollback/i);
    expect(briefAsMarkdown(examples.security)).toContain("Questions for independent challenge");
  });

  it("never promotes a modeled case to a verified outcome", () => {
    const modeled = { ...examples.infrastructure, evidenceState: "modeled" as const };
    expect(readinessLabel(modeled)).toMatch(/field verification required/);
    expect(briefAsMarkdown(modeled)).toContain("Modeled / simulated");
  });

  it("requires explicit evidence review even after all fields are supplied", () => {
    const asserted = { ...examples.ai, evidenceState: "independently_verified" as const };
    expect(readinessLabel(asserted)).toContain("claims require evidence review");
    expect(briefAsMarkdown(asserted)).toContain("user-asserted");
  });
});
