export interface DastorChapter {
  slug: string;
  number: number;
  title: string;
  partNumber: number;
  partTitle: string;
  executiveSummary: string;
  thesis?: string;
  scenario?: string;
  exploitPaths: Array<{ title: string; content: string }>;
  rootCauses: Array<{ title: string; content: string }>;
  impacts: {
    financial?: string;
    operational?: string;
    compliance?: string;
  };
  countermeasureGroups: Array<{
    title: string;
    controls: Array<{ number?: number; text: string }>;
  }>;
  detectionGuidance: string[];
  remediationPlaybook: Array<{ number?: number; text: string }>;
  executionReceipt?: Record<string, unknown>;
  frameworks: string[];
  executionLayers: string[];
  riskTypes: string[];
  industries: string[];
  vulnerabilityClass?: string;
  controlType?: string;
  publicExcerpt: boolean;
}

export interface DastorPart {
  number: number;
  title: string;
  slug: string;
  chapterNumbers: number[];
  summary: string;
}

export interface PublicationMeta {
  title: string;
  shortTitle?: string;
  formalTitle?: string;
  subtitle: string;
  taglineSecondary?: string;
  primaryTagline?: string;
  publisher: string;
  author: string;
  category: string;
  categoryShort?: string;
  formerly?: string;
  version?: string;
  thesis: string;
  thesisSupporting: string;
  supportingStatement?: string;
  categoryExplanation?: string;
  operatingModel?: string;
  boundaryStatement?: string;
  governingRules: string[];
  canonicalSite?: string;
  legacySite?: string;
  githubRepo?: string;
  verifiedCounts: {
    chapters: number;
    parts: number;
    vulnerabilitiesLabel: string;
    frameworks: string[];
    source: string;
    discrepancies: string[];
  };
  sampleChapterSlug: string;
}

export type InspectionMode = "normal" | "attack" | "countermeasures";

export type Severity = "informational" | "moderate" | "high" | "critical";

export interface ExecutionStackCountermeasures {
  prevent: string[];
  detect: string[];
  contain: string[];
  recover: string[];
  verify: string[];
}

export interface ExecutionStackScenario {
  initialCondition: string;
  failureOrAttack: string;
  propagation: string;
  consequence: string;
  countermeasure: string;
  validation: string;
}

export interface ExecutionStackLayer {
  id: string;
  number: number;
  name: string;
  purpose: string;
  inputs: string[];
  processing: string[];
  outputs: string[];
  dependencies: string[];
  trustBoundaries: string[];
  /** @deprecated Prefer trustBoundaries; retained for home-page previews. */
  trustBoundary: string;
  threatActors: string[];
  attackSurfaces: string[];
  failureModes: string[];
  propagationPaths: string[];
  consequences: string[];
  severity: Severity;
  countermeasures: ExecutionStackCountermeasures;
  exampleScenario: ExecutionStackScenario;
  residualRisk: string[];
  relatedChapterSlugs: string[];
  /** Legacy summary fields retained for compatibility with older previews. */
  representativeVulnerabilities: string[];
  controlOpportunities: string[];
}

export interface ContactRecord {
  firstName: string;
  lastName: string;
  workEmail: string;
  organization: string;
  role: string;
  interest?: string;
  consentVersion: string;
  consentTimestamp: string;
  utm?: Record<string, string | undefined>;
  referrer?: string;
  landingPage?: string;
  firstTouchTimestamp?: string;
  requestTimestamp: string;
  resourceRequested: string;
  hashedIp?: string;
  userAgentCategory?: string;
}

export interface ContactResult {
  contactId: string;
  synced: boolean;
  queued?: boolean;
}

export interface ContactActivity {
  contactId: string;
  type: string;
  resource?: string;
  metadata?: Record<string, unknown>;
}

export interface ContactAdapter {
  upsertContact(contact: ContactRecord): Promise<ContactResult>;
  recordActivity(activity: ContactActivity): Promise<void>;
  addToSequence?(sequenceId: string, contactId: string): Promise<void>;
}

export interface CheckoutRequest {
  productId: string;
  quantity: number;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export interface CommerceEvent {
  type: string;
  sessionId: string;
  productId: string;
  customerEmail?: string;
}

export interface Entitlement {
  id: string;
  productId: string;
  email: string;
  grantedAt: string;
}

export interface CommerceAdapter {
  createCheckout(input: CheckoutRequest): Promise<CheckoutSession>;
  verifyWebhook(payload: unknown, signature: string): Promise<CommerceEvent>;
  grantEntitlement(event: CommerceEvent): Promise<Entitlement>;
}
