"""Non-production IEG reference guardrail.

Licensed under Apache-2.0 per CONTENT-LICENSE.md.

The model may propose a tool call. It does not decide authority, policy, or whether
execution occurs. The host supplies AuthorityContext from a trusted control plane.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, FrozenSet, Mapping
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class ConsequenceTier(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Decision(str, Enum):
    ALLOW = "ALLOW"
    CONSTRAIN = "CONSTRAIN"
    STEP_UP = "STEP_UP"
    DENY = "DENY"


class InterAgentPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    call_id: str = Field(min_length=1, max_length=256)
    actor_id: str = Field(min_length=1, max_length=256)
    target_tool: str = Field(min_length=1, max_length=128)
    tool_arguments: dict[str, Any]


class FetchUserProfileArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)
    user_id: int = Field(ge=1)


class StageEmailDraftArgs(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)
    recipient_id: str = Field(min_length=1, max_length=128)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=10000)


class RequestPaymentReleaseArgs(BaseModel):
    """Demo-only protected action. The reference never transfers funds."""

    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)
    payment_id: str = Field(min_length=1, max_length=128)
    amount_cents: int = Field(gt=0, le=100_000_000)
    destination_id: str = Field(min_length=1, max_length=128)


@dataclass(frozen=True)
class ToolPolicy:
    name: str
    args_model: type[BaseModel]
    consequence: ConsequenceTier
    protected_action: bool
    required_authorities: FrozenSet[str]
    policy_id: str
    policy_version: str = "1"


TOOL_REGISTRY: Mapping[str, ToolPolicy] = {
    "fetch_user_profile": ToolPolicy(
        name="fetch_user_profile",
        args_model=FetchUserProfileArgs,
        consequence=ConsequenceTier.LOW,
        protected_action=False,
        required_authorities=frozenset({"profile.read"}),
        policy_id="ieg.tool.fetch_user_profile",
    ),
    "stage_email_draft": ToolPolicy(
        name="stage_email_draft",
        args_model=StageEmailDraftArgs,
        consequence=ConsequenceTier.MODERATE,
        protected_action=False,
        required_authorities=frozenset({"email.draft"}),
        policy_id="ieg.tool.stage_email_draft",
    ),
    "request_payment_release": ToolPolicy(
        name="request_payment_release",
        args_model=RequestPaymentReleaseArgs,
        consequence=ConsequenceTier.HIGH,
        protected_action=True,
        required_authorities=frozenset({"payment.request", "payment.approver"}),
        policy_id="ieg.tool.request_payment_release",
    ),
}


class AuthorityContext(BaseModel):
    """Trusted host input. Do not construct this from model output or user prose."""

    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)
    principal_id: str = Field(min_length=1, max_length=256)
    authorities: frozenset[str]
    authority_source: str = Field(min_length=1, max_length=256)
    authority_version: str = Field(min_length=1, max_length=128)


class ExecutionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    request_id: UUID = Field(default_factory=uuid4)
    call_id: str
    actor_id: str
    principal_id: str
    tool_name: str
    arguments: dict[str, Any]
    consequence: ConsequenceTier
    protected_action: bool
    payload_hash: str
    policy_id: str
    policy_version: str
    authority_source: str
    authority_version: str


class DecisionReceipt(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    receipt_id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    request: ExecutionRequest
    decision: Decision
    reason_codes: tuple[str, ...]
    decision_hash: str


class ExecutionReceipt(BaseModel):
    """Post-execution evidence. It must not be minted as proof before execution."""

    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)

    receipt_id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    request_id: UUID
    decision_receipt_id: UUID
    decision_hash: str
    payload_hash: str
    result_hash: str
    execution_status: str
    executor_id: str
    signer_ref: str | None = None
    receipt_hash: str


def canonical_hash(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    return "sha256:" + hashlib.sha256(payload).hexdigest()


def authorize_agent_request(raw_payload: dict[str, Any], authority: AuthorityContext) -> DecisionReceipt:
    """Validate structure, resolve deterministic policy, and decide authority.

    Unknown tools, schema errors, actor/principal mismatch, and missing authorities fail closed.
    A HIGH consequence label by itself never grants authority.
    """

    try:
        payload = InterAgentPayload.model_validate(raw_payload, strict=True)
    except ValidationError as exc:
        return _deny_unparseable(raw_payload, authority, "SCHEMA_VALIDATION_FAILED", str(exc))

    policy = TOOL_REGISTRY.get(payload.target_tool)
    if policy is None:
        return _deny_unparseable(raw_payload, authority, "TOOL_NOT_REGISTERED", payload.target_tool)

    try:
        validated_args = policy.args_model.model_validate(payload.tool_arguments, strict=True)
    except ValidationError as exc:
        return _decision_for_valid_payload(
            payload,
            authority,
            policy,
            {},
            Decision.DENY,
            ("TOOL_ARGUMENT_SCHEMA_FAILED", str(exc)),
        )

    normalized_args = validated_args.model_dump(mode="json")
    missing = sorted(policy.required_authorities.difference(authority.authorities))
    if missing:
        decision = Decision.STEP_UP if policy.protected_action else Decision.DENY
        return _decision_for_valid_payload(
            payload,
            authority,
            policy,
            normalized_args,
            decision,
            tuple(["REQUIRED_AUTHORITY_MISSING", *[f"MISSING:{x}" for x in missing]]),
        )

    return _decision_for_valid_payload(
        payload,
        authority,
        policy,
        normalized_args,
        Decision.ALLOW,
        ("POLICY_AND_AUTHORITY_SATISFIED",),
    )


def complete_execution(
    decision_receipt: DecisionReceipt,
    *,
    execution_result: Any,
    execution_status: str,
    executor_id: str,
    signer_ref: str | None = None,
) -> ExecutionReceipt:
    """Create post-execution evidence after the downstream executor returns.

    signer_ref should identify an external signing service/HSM/enclave record. This
    reference implementation intentionally does not keep signing keys in-process.
    """

    if decision_receipt.decision not in {Decision.ALLOW, Decision.CONSTRAIN}:
        raise PermissionError("execution receipt cannot be created for a non-executable decision")

    result_hash = canonical_hash(execution_result)
    body = {
        "request_id": str(decision_receipt.request.request_id),
        "decision_receipt_id": str(decision_receipt.receipt_id),
        "decision_hash": decision_receipt.decision_hash,
        "payload_hash": decision_receipt.request.payload_hash,
        "result_hash": result_hash,
        "execution_status": execution_status,
        "executor_id": executor_id,
        "signer_ref": signer_ref,
    }
    return ExecutionReceipt(
        **body,
        request_id=decision_receipt.request.request_id,
        decision_receipt_id=decision_receipt.receipt_id,
        receipt_hash=canonical_hash(body),
    )


def _decision_for_valid_payload(
    payload: InterAgentPayload,
    authority: AuthorityContext,
    policy: ToolPolicy,
    normalized_args: dict[str, Any],
    decision: Decision,
    reasons: tuple[str, ...],
) -> DecisionReceipt:
    request_body = {
        "call_id": payload.call_id,
        "actor_id": payload.actor_id,
        "principal_id": authority.principal_id,
        "tool_name": policy.name,
        "arguments": normalized_args,
        "consequence": policy.consequence.value,
        "protected_action": policy.protected_action,
        "policy_id": policy.policy_id,
        "policy_version": policy.policy_version,
        "authority_source": authority.authority_source,
        "authority_version": authority.authority_version,
    }
    request = ExecutionRequest(
        call_id=payload.call_id,
        actor_id=payload.actor_id,
        principal_id=authority.principal_id,
        tool_name=policy.name,
        arguments=normalized_args,
        consequence=policy.consequence,
        protected_action=policy.protected_action,
        payload_hash=canonical_hash(request_body),
        policy_id=policy.policy_id,
        policy_version=policy.policy_version,
        authority_source=authority.authority_source,
        authority_version=authority.authority_version,
    )
    decision_body = {
        "request_id": str(request.request_id),
        "payload_hash": request.payload_hash,
        "decision": decision.value,
        "reason_codes": reasons,
        "policy_id": policy.policy_id,
        "policy_version": policy.policy_version,
        "authority_source": authority.authority_source,
        "authority_version": authority.authority_version,
    }
    return DecisionReceipt(
        request=request,
        decision=decision,
        reason_codes=reasons,
        decision_hash=canonical_hash(decision_body),
    )


def _deny_unparseable(
    raw_payload: dict[str, Any],
    authority: AuthorityContext,
    code: str,
    detail: str,
) -> DecisionReceipt:
    safe_tool = str(raw_payload.get("target_tool", "UNKNOWN"))[:128]
    safe_call = str(raw_payload.get("call_id", "UNKNOWN"))[:256]
    safe_actor = str(raw_payload.get("actor_id", "UNKNOWN"))[:256]
    policy = ToolPolicy(
        name=safe_tool,
        args_model=FetchUserProfileArgs,
        consequence=ConsequenceTier.CRITICAL,
        protected_action=True,
        required_authorities=frozenset(),
        policy_id="ieg.tool.unregistered",
    )
    payload = InterAgentPayload.model_construct(
        call_id=safe_call or "UNKNOWN",
        actor_id=safe_actor or "UNKNOWN",
        target_tool=safe_tool or "UNKNOWN",
        tool_arguments={},
    )
    return _decision_for_valid_payload(payload, authority, policy, {}, Decision.DENY, (code, detail))
