export type ConsequenceSector = "security" | "ai" | "infrastructure" | "change";
export type EvidenceState = "hypothesis" | "modeled" | "observed" | "independently_verified";

export interface ConsequenceDraft {
  sector: ConsequenceSector;
  title: string;
  affected: string;
  trigger: string;
  pathway: string;
  consequence: string;
  boundary: string;
  mitigation: string;
  evidence: string;
  uncertainty: string;
  evidenceState: EvidenceState;
}

export const sectorLabels: Record<ConsequenceSector, string> = {
  security: "Cybersecurity and vulnerabilities",
  ai: "AI agents and autonomous actions",
  infrastructure: "Compute, power, and cooling",
  change: "Software changes and delivery",
};

export const evidenceLabels: Record<EvidenceState, string> = {
  hypothesis: "Hypothesis only",
  modeled: "Modeled / simulated",
  observed: "Observed in an authorized test or operation",
  independently_verified: "Independently verified (user-asserted)",
};

export const sectorQuestions: Record<ConsequenceSector, string> = {
  security: "Can the weakness reach a protected business outcome?",
  ai: "Could an authorized tool action produce an unacceptable result?",
  infrastructure: "Could a capacity decision alter cost, quality, thermal reserve, or service?",
  change: "Could this release change availability, integrity, customer operations, or rollback?",
};

export const fieldGuidance: Record<ConsequenceSector, { trigger: string; consequence: string; boundary: string }> = {
  security: {
    trigger: "An attacker-controlled input, configuration failure, or reachable weakness",
    consequence: "Affected business service, data, financial operation, or safety outcome",
    boundary: "Access controls, business constraints, or changes that must not be permitted",
  },
  ai: {
    trigger: "An agent, model, or tool attempting an action",
    consequence: "A real-world change that the agent could cause",
    boundary: "Required authority, approval, permitted action, and revocation condition",
  },
  infrastructure: {
    trigger: "A workload shift, cooling constraint, power limitation, or capacity decision",
    consequence: "Service, resource, cost, or safety impact under a stated baseline",
    boundary: "Quality, thermal, power, resilience, and contractual limits",
  },
  change: {
    trigger: "A change, pipeline step, dependency, or deployment action",
    consequence: "User-facing, financial, security, or operational impact",
    boundary: "Required approvals, tests, release conditions, and rollback criteria",
  },
};

export function emptyDraft(sector: ConsequenceSector = "security"): ConsequenceDraft {
  return {
    sector, title: "", affected: "", trigger: "", pathway: "", consequence: "",
    boundary: "", mitigation: "", evidence: "", uncertainty: "", evidenceState: "hypothesis",
  };
}

// Hypothetical examples only. None describes a validated BlockSiFr finding or a real customer.
export const examples: Record<ConsequenceSector, ConsequenceDraft> = {
  security: {
    sector: "security", title: "Example: privileged CI workflow exposure",
    affected: "Illustrative release pipeline for a customer-facing service",
    trigger: "Potentially untrusted code reaching a privileged workflow",
    pathway: "If the workflow actually executes contributor-controlled instructions with elevated permissions, deployment credentials or artifacts could be affected. Scope requires verification.",
    consequence: "Possible unauthorized deployment or service interruption; no outcome has been demonstrated.",
    boundary: "Do not execute untrusted source with privileged credentials. Require trusted checkout and restricted tokens.",
    mitigation: "Review trigger/checkout semantics and credential scope, then conduct an approved non-destructive test.",
    evidence: "Static workflow inspection only; no permission scope or execution consequence proven.",
    uncertainty: "Trigger reachability, privileged execution, and protected outcome are unconfirmed.",
    evidenceState: "hypothesis",
  },
  ai: {
    sector: "ai", title: "Example: agent attempts an unapproved change",
    affected: "Illustrative production change-management workflow",
    trigger: "An assistant proposes to update a production configuration",
    pathway: "Tool request -> authority decision -> allowed or denied operation -> receipt",
    consequence: "Unreviewed change could disrupt service if an inadequate gate allowed execution. No such incident is asserted.",
    boundary: "Production changes need explicit scoped approval and a reversible procedure.",
    mitigation: "Implement pre-execution authority evaluation and test deny, step-up, and receipt behavior.",
    evidence: "Example decision chain only; no observed customer system or production outcome.",
    uncertainty: "Policy quality, enforcement integration, and rollback readiness need testing.",
    evidenceState: "hypothesis",
  },
  infrastructure: {
    sector: "infrastructure", title: "Example: reschedule compute to avoid a cooling peak",
    affected: "Illustrative GPU workload and cooling plant",
    trigger: "Proposed workload rescheduling during a thermal constraint",
    pathway: "Workload demand -> facility load -> cooling demand -> thermal reserve and quality constraints",
    consequence: "Potential reduction in peak demand, but savings and service quality are unmeasured.",
    boundary: "Preserve workload quality, committed capacity, thermal floor, and facility safety constraints.",
    mitigation: "Establish an interval baseline and compare constrained and baseline dispatch under instrumented conditions.",
    evidence: "Conceptual scenario; no metered facility outcome or verified financial savings.",
    uncertainty: "Time-dependent load, plant efficiency, workload quality, and tariff impacts are unknown.",
    evidenceState: "hypothesis",
  },
  change: {
    sector: "change", title: "Example: a release changes availability",
    affected: "Illustrative customer-facing application",
    trigger: "A schema migration ships with a new version",
    pathway: "Deployment -> incompatible read path -> request failures -> recovery / rollback window",
    consequence: "Potential customer downtime and delayed transactions. No incident or loss is claimed.",
    boundary: "Passing compatibility checks, monitored rollout, rollback readiness, and change approval.",
    mitigation: "Test backward compatibility, rehearsed rollback, and staged deployment with objective gates.",
    evidence: "Design review scenario; no fault-injection run or service impact observed.",
    uncertainty: "Traffic, recovery time, dependency behavior, and customer exposure require measurement.",
    evidenceState: "hypothesis",
  },
};

export function missingFields(draft: ConsequenceDraft): string[] {
  const fields: [keyof ConsequenceDraft, string][] = [
    ["title", "Case title"],
    ["affected", "Affected service or asset"],
    ["trigger", "Initiating event or decision"],
    ["pathway", "Causal pathway"],
    ["consequence", "Business or operational consequence"],
    ["boundary", "Protected outcome or constraint"],
    ["evidence", "Evidence and its limitations"],
    ["uncertainty", "Known uncertainty"],
    ["mitigation", "Next validation or protective action"],
  ];
  return fields.filter(([key]) => !draft[key].trim()).map(([, label]) => label);
}

export function readinessLabel(draft: ConsequenceDraft): string {
  if (missingFields(draft).length) return "Draft: material gaps remain";
  if (draft.evidenceState === "hypothesis") return "Hypothesis documented: verification required";
  if (draft.evidenceState === "modeled") return "Modeled: field verification required";
  return "Review-ready brief: claims require evidence review";
}

export const sectorReviewQuestions: Record<ConsequenceSector, string[]> = {
  security: [
    "Which precise preconditions connect the reported weakness to the protected consequence?",
    "Which existing defenses, permission checks, or platform behavior could break that path?",
    "What authorized, non-destructive observation would establish reachability and effect?",
  ],
  ai: [
    "Did the action require a scoped authority grant at the point of execution?",
    "What happens when the request is denied, stepped up, revoked, or replayed?",
    "Does the evidence establish what the tool actually changed, not just what was approved?",
  ],
  infrastructure: [
    "What measured baseline captures equivalent workload quality and time conditions?",
    "Which power, cooling, reserve, tariff, or resilience constraint could negate the apparent benefit?",
    "Were facility energy and financial effects measured, or only inferred from compute metrics?",
  ],
  change: [
    "Which changed dependency or privilege could expose a critical customer outcome?",
    "Which regression or staging test actually exercised the hypothesized failure pathway?",
    "Has rollback or containment been demonstrated under a realistic failure condition?",
  ],
};

export function challengeQuestions(draft: ConsequenceDraft): string[] {
  const questions = [...sectorReviewQuestions[draft.sector]];
  if (!draft.pathway.trim()) {
    questions.unshift("What causal steps are missing between the initiating event and the claimed outcome?");
  }
  if (!draft.uncertainty.trim()) {
    questions.push("What observation or vendor defense would falsify the conclusion?");
  }
  if (draft.evidenceState === "hypothesis" || draft.evidenceState === "modeled") {
    questions.push("What next authorized test or instrumented observation could advance this beyond " + evidenceLabels[draft.evidenceState].toLowerCase() + "?");
  } else {
    questions.push("Who can independently examine the underlying artifacts, scope, and counterarguments?");
  }
  return questions.slice(0, 6);
}

export function briefAsMarkdown(draft: ConsequenceDraft): string {
  const safe = (value: string) => value.trim() || "[not supplied]";
  return [
    "# Consequence Brief",
    "",
    "Generated with the public BlockSiFr IEG Consequence Brief Builder.",
    "Status: " + readinessLabel(draft),
    "Evidence classification: " + evidenceLabels[draft.evidenceState],
    "Sector: " + sectorLabels[draft.sector],
    "",
    "## Case",
    safe(draft.title),
    "",
    "## Affected service, system, or asset",
    safe(draft.affected),
    "",
    "## Initiating event or action",
    safe(draft.trigger),
    "",
    "## Causal pathway",
    safe(draft.pathway),
    "",
    "## Potential consequence",
    safe(draft.consequence),
    "",
    "## Admissible boundary",
    safe(draft.boundary),
    "",
    "## Available evidence",
    safe(draft.evidence),
    "",
    "## Uncertainty and exclusions",
    safe(draft.uncertainty),
    "",
    "## Next protective or validation action",
    safe(draft.mitigation),
    "",
    "## Completeness gaps",
    missingFields(draft).length ? missingFields(draft).map((x) => "- " + x).join("\n") : "No required fields omitted. Evidence still requires independent review.",
    "",
    "## Questions for independent challenge",
    ...challengeQuestions(draft).map((question) => "- " + question),
    "",
    "## Evidence caveat",
    "All contents are user-authored or clearly labeled examples. This document is not a vulnerability verification, audit opinion, impact measurement, authority grant, certification, or independent attestation.",
    "",
    "Public method: https://ieg.blocksifr.com/consequence-intelligence",
    "Builder: https://ieg.blocksifr.com/brief",
    "BlockSiFr: https://blocksifr.com",
    "",
  ].join("\n");
}
