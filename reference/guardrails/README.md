# IEG guarded tool-calling reference

This directory contains **non-production reference code** for enforcing IEG concepts around model-generated tool calls.

The core rule is simple:

> A model may propose an action. It does not classify its own authority and it does not execute itself.

## Control path

```text
Model proposes function call
  -> strict provider schema
  -> host parses call
  -> deterministic tool registry
  -> tool-specific argument validation
  -> trusted AuthorityContext
  -> ALLOW / CONSTRAIN / STEP_UP / DENY
  -> downstream executor
  -> post-execution evidence
  -> external signing / append-only storage in production
```

This is a reference adapter for the public doctrine. BlockSiFr runtime enforcement products remain separate.

## Why this is stricter than a basic Pydantic wrapper

A schema validator is necessary but not sufficient. The reference deliberately avoids several unsafe shortcuts:

1. **No model-authored clearance.** `AuthorityContext` must be supplied by the trusted host/control plane.
2. **No universal ordinal privilege shortcut.** Each tool has explicit required authorities. A generic `HIGH` label does not imply permission.
3. **Unknown tools fail closed.** There is no dynamic model-created tool registration.
4. **Arguments are tool-specific.** `Dict[str, Any]` is not treated as sufficient validation.
5. **Decision evidence is separate from execution evidence.** A pre-execution authorization record is not represented as proof that execution occurred.
6. **Execution receipts are post-execution.** They bind the normalized request, decision, result and executor through hashes.
7. **No in-process signing key.** Production signing should occur through a separately controlled HSM, KMS, enclave or signing service. The sample only carries a `signer_ref`.
8. **No claim of prompt-injection immunity.** The purpose is to prevent compromised language from directly becoming execution authority.

## Files

- `ieg_guardrails.py`: deterministic registry, strict Pydantic models, authority gate, decision receipts and post-execution receipts.
- `openai_responses_pipeline.py`: OpenAI Responses API function-call adapter that routes every function call through the guardrail before invoking a bound executor.
- `test_guardrails.py`: local deterministic tests. No OpenAI API key is required.

## Install

```bash
python -m venv .venv
source .venv/bin/activate
pip install 'pydantic>=2,<3' 'openai>=1'
python reference/guardrails/test_guardrails.py
```

For the live OpenAI example:

```bash
export OPENAI_API_KEY='...'
export OPENAI_MODEL='gpt-5.4-mini'
python reference/guardrails/openai_responses_pipeline.py
```

Choose a model available to your OpenAI project. The guardrail is provider-independent; the OpenAI adapter is only one ingress path.

## Production requirements not implemented here

Do not treat this sample as a secure enforcement plane by itself. A production implementation should additionally provide:

- protected-action registry versioning and signed policy distribution
- parameter-sensitive consequence rules
- independent identity and non-human identity resolution
- nonce / expiry / replay protection for execution authorization
- TOCTOU-safe binding between the authorized payload and the exact downstream payload
- isolated receipt signing
- append-only or independently controlled evidence storage
- policy and signing-key rotation
- idempotency controls
- distributed tracing across multi-agent handoffs
- rate limits and abuse controls
- tenant isolation
- secrets redaction from receipt payloads
- failure-domain separation between model runtime, authority service and executor

## Licensing

Reference code and schemas are Apache 2.0 under the repository's `CONTENT-LICENSE.md` terms.
