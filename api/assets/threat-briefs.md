# DASTOR Selected Threat Briefs

*Gated practitioner briefs derived from the field manual chapter catalog.*

## Brief: AI Is Not Software

**Thesis:** Establishes why deterministic security assumptions fail when policy compliance is an inference problem under uncertainty.

**Scenario:** A helpful enterprise assistant turns a plausible answer into an irreversible operational action.

- **Ambiguity to wrong action:** Ambiguity yields a plausible inference that becomes an irreversible operational action.
- **Long-context constraint loss:** Constraints degrade under length and salience competition.

## Brief: The AI Execution Stack Reference Model

**Thesis:** Defines the canonical stack used throughout the manual and maps vendor agent abstractions to layers.

**Scenario:** The same workflow on multiple platforms exhibits the same failure modes because the stack is shared.


## Brief: Prompt Injection

**Thesis:** Prompt injection is input-level control-plane compromise; indirect injection weaponizes retrieval and tool outputs.

**Scenario:** An agent summarizes a document; hidden instructions hijack output and tool use.


## Brief: Context Poisoning

**Thesis:** Retrieved equals trusted is the default failure mode; poisoning attacks target the retrieval layer.

**Scenario:** Internal knowledge-base ingestion pulls malicious content; the assistant repeats attacker-chosen answers.


## Brief: Reasoning Failures and Goal Hijacking

**Thesis:** Planning is inference; attackers target objective inference and constraint weighting.

**Scenario:** An agent tasked to help is reframed into unsafe or unauthorized subtasks.


## Brief: Tool Exploitation

**Thesis:** Tools turn language failures into real-world side effects; tool selection and execution are exploitable surfaces.

**Scenario:** An agent with file, database, or API tools is induced to call a tool with malicious but schema-valid arguments.


## Brief: Execution Failures and Side Effects

**Thesis:** Blind execution, races, and missing confirmations convert inference errors into irreversible change.


## Brief: Memory Is an Attack Surface

**Thesis:** Persistent memory enables lasting injection, poisoning, and cross-session contamination.


---

Publisher: BlockSiFr LLC
Classification: Gated resource
