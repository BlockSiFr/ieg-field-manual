"""OpenAI Responses API adapter for the IEG reference guardrail.

Non-production reference code. The model proposes tool calls. The trusted host
validates policy and authority before invoking any downstream implementation.
"""

from __future__ import annotations

import json
import os
from typing import Any, Callable

from openai import OpenAI

from ieg_guardrails import (
    AuthorityContext,
    Decision,
    authorize_agent_request,
    complete_execution,
)


TOOLS = [
    {
        "type": "function",
        "name": "fetch_user_profile",
        "description": "Read a user profile by numeric ID.",
        "parameters": {
            "type": "object",
            "properties": {"user_id": {"type": "integer", "minimum": 1}},
            "required": ["user_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "stage_email_draft",
        "description": "Stage an email draft. This does not send the message.",
        "parameters": {
            "type": "object",
            "properties": {
                "recipient_id": {"type": "string", "minLength": 1},
                "subject": {"type": "string", "minLength": 1, "maxLength": 200},
                "body": {"type": "string", "minLength": 1, "maxLength": 10000},
            },
            "required": ["recipient_id", "subject", "body"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "request_payment_release",
        "description": "Create a payment-release request for a separately authorized backend. This demo never transfers funds.",
        "parameters": {
            "type": "object",
            "properties": {
                "payment_id": {"type": "string", "minLength": 1},
                "amount_cents": {"type": "integer", "minimum": 1, "maximum": 100000000},
                "destination_id": {"type": "string", "minLength": 1},
            },
            "required": ["payment_id", "amount_cents", "destination_id"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]


def fetch_user_profile(*, user_id: int) -> dict[str, Any]:
    return {"status": "ok", "user_id": user_id, "profile": {"display_name": "Example User"}}


def stage_email_draft(*, recipient_id: str, subject: str, body: str) -> dict[str, Any]:
    return {
        "status": "staged",
        "recipient_id": recipient_id,
        "subject": subject,
        "body_length": len(body),
    }


def request_payment_release(*, payment_id: str, amount_cents: int, destination_id: str) -> dict[str, Any]:
    # Reference behavior only: this creates a request record and never transfers funds.
    return {
        "status": "release_request_recorded",
        "payment_id": payment_id,
        "amount_cents": amount_cents,
        "destination_id": destination_id,
        "executed_transfer": False,
    }


IMPLEMENTATIONS: dict[str, Callable[..., dict[str, Any]]] = {
    "fetch_user_profile": fetch_user_profile,
    "stage_email_draft": stage_email_draft,
    "request_payment_release": request_payment_release,
}


def run_agent_turn(
    *,
    prompt: str,
    actor_id: str,
    authority: AuthorityContext,
    client: OpenAI | None = None,
    model: str | None = None,
    max_tool_rounds: int = 8,
) -> dict[str, Any]:
    """Run a guarded Responses API tool loop.

    AuthorityContext must come from the application/control plane. Never derive it
    from the user's prompt, model output, or a model-authored clearance claim.
    """

    client = client or OpenAI()
    model = model or os.environ.get("OPENAI_MODEL", "gpt-5.4-mini")

    response = client.responses.create(
        model=model,
        input=prompt,
        tools=TOOLS,
    )

    decision_receipts: list[dict[str, Any]] = []
    execution_receipts: list[dict[str, Any]] = []

    for _ in range(max_tool_rounds):
        calls = [item for item in response.output if getattr(item, "type", None) == "function_call"]
        if not calls:
            return {
                "status": "completed",
                "text": response.output_text,
                "response_id": response.id,
                "decision_receipts": decision_receipts,
                "execution_receipts": execution_receipts,
            }

        outputs = []
        for call in calls:
            try:
                arguments = json.loads(call.arguments)
            except json.JSONDecodeError as exc:
                arguments = {"_invalid_json": str(exc)}

            decision = authorize_agent_request(
                {
                    "call_id": call.call_id,
                    "actor_id": actor_id,
                    "target_tool": call.name,
                    "tool_arguments": arguments,
                },
                authority,
            )
            decision_receipts.append(decision.model_dump(mode="json"))

            if decision.decision not in {Decision.ALLOW, Decision.CONSTRAIN}:
                tool_output = {
                    "status": "blocked",
                    "decision": decision.decision.value,
                    "reason_codes": list(decision.reason_codes),
                    "decision_hash": decision.decision_hash,
                }
            else:
                implementation = IMPLEMENTATIONS.get(decision.request.tool_name)
                if implementation is None:
                    tool_output = {
                        "status": "blocked",
                        "decision": "DENY",
                        "reason_codes": ["NO_BOUND_EXECUTOR"],
                        "decision_hash": decision.decision_hash,
                    }
                else:
                    result = implementation(**decision.request.arguments)
                    execution = complete_execution(
                        decision,
                        execution_result=result,
                        execution_status=str(result.get("status", "completed")),
                        executor_id=f"reference:{decision.request.tool_name}",
                        signer_ref=None,
                    )
                    execution_receipts.append(execution.model_dump(mode="json"))
                    tool_output = {
                        "status": "executed",
                        "result": result,
                        "decision_hash": decision.decision_hash,
                        "execution_receipt_hash": execution.receipt_hash,
                    }

            outputs.append(
                {
                    "type": "function_call_output",
                    "call_id": call.call_id,
                    "output": json.dumps(tool_output, separators=(",", ":")),
                }
            )

        response = client.responses.create(
            model=model,
            previous_response_id=response.id,
            input=outputs,
            tools=TOOLS,
        )

    return {
        "status": "tool_round_limit_reached",
        "text": response.output_text,
        "response_id": response.id,
        "decision_receipts": decision_receipts,
        "execution_receipts": execution_receipts,
    }


if __name__ == "__main__":
    trusted_authority = AuthorityContext(
        principal_id="demo-user-1",
        authorities=frozenset({"profile.read", "email.draft"}),
        authority_source="demo-host-policy",
        authority_version="1",
    )

    result = run_agent_turn(
        prompt=(
            "Look up user 9923. If useful, stage an email draft to recipient demo-42. "
            "Do not request or perform any payment action."
        ),
        actor_id="demo-agent",
        authority=trusted_authority,
    )
    print(json.dumps(result, indent=2, default=str))
