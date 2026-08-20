from __future__ import annotations

from ieg_guardrails import (
    AuthorityContext,
    Decision,
    authorize_agent_request,
    complete_execution,
)


def authority(*grants: str) -> AuthorityContext:
    return AuthorityContext(
        principal_id="test-principal",
        authorities=frozenset(grants),
        authority_source="test-authority-service",
        authority_version="2026-08-20",
    )


def test_allow_read() -> None:
    decision = authorize_agent_request(
        {
            "call_id": "call-1",
            "actor_id": "agent-a",
            "target_tool": "fetch_user_profile",
            "tool_arguments": {"user_id": 42},
        },
        authority("profile.read"),
    )
    assert decision.decision is Decision.ALLOW
    assert decision.request.protected_action is False
    assert decision.request.arguments == {"user_id": 42}
    assert decision.request.payload_hash.startswith("sha256:")

    execution = complete_execution(
        decision,
        execution_result={"status": "ok", "user_id": 42},
        execution_status="ok",
        executor_id="test:fetch_user_profile",
    )
    assert execution.receipt_hash.startswith("sha256:")
    assert execution.payload_hash == decision.request.payload_hash
    assert execution.decision_hash == decision.decision_hash


def test_payment_requires_explicit_authorities() -> None:
    decision = authorize_agent_request(
        {
            "call_id": "call-2",
            "actor_id": "agent-a",
            "target_tool": "request_payment_release",
            "tool_arguments": {
                "payment_id": "p-1",
                "amount_cents": 2500,
                "destination_id": "dest-1",
            },
        },
        authority("payment.request"),
    )
    assert decision.decision is Decision.STEP_UP
    assert "MISSING:payment.approver" in decision.reason_codes

    try:
        complete_execution(
            decision,
            execution_result={"status": "should_not_run"},
            execution_status="completed",
            executor_id="test",
        )
    except PermissionError:
        pass
    else:
        raise AssertionError("non-executable decision minted an execution receipt")


def test_argument_injection_fails_closed() -> None:
    decision = authorize_agent_request(
        {
            "call_id": "call-3",
            "actor_id": "agent-a",
            "target_tool": "fetch_user_profile",
            "tool_arguments": {"user_id": 42, "bypass_security": True},
        },
        authority("profile.read"),
    )
    assert decision.decision is Decision.DENY
    assert decision.reason_codes[0] == "TOOL_ARGUMENT_SCHEMA_FAILED"


def test_unknown_tool_fails_closed() -> None:
    decision = authorize_agent_request(
        {
            "call_id": "call-4",
            "actor_id": "agent-a",
            "target_tool": "hidden_admin_tool",
            "tool_arguments": {},
        },
        authority("profile.read", "payment.request", "payment.approver"),
    )
    assert decision.decision is Decision.DENY
    assert decision.reason_codes[0] == "TOOL_NOT_REGISTERED"
    assert decision.request.protected_action is True


def test_wrong_type_is_not_coerced() -> None:
    decision = authorize_agent_request(
        {
            "call_id": "call-5",
            "actor_id": "agent-a",
            "target_tool": "fetch_user_profile",
            "tool_arguments": {"user_id": "42"},
        },
        authority("profile.read"),
    )
    assert decision.decision is Decision.DENY
    assert decision.reason_codes[0] == "TOOL_ARGUMENT_SCHEMA_FAILED"


def main() -> None:
    test_allow_read()
    test_payment_requires_explicit_authorities()
    test_argument_injection_fails_closed()
    test_unknown_tool_fails_closed()
    test_wrong_type_is_not_coerced()
    print("IEG reference guardrail tests passed")


if __name__ == "__main__":
    main()
