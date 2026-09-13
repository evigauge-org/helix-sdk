# packages/python/helix_sdk/errors.py
from __future__ import annotations

from typing import Any, Literal

AEPErrorSymbol = Literal[
    "authn_failed",
    "authz_denied",
    "capability_not_supported",
    "ceiling_exceeded",
    "budget_exhausted",
    "tree_boundary_violation",
    "subject_not_found",
    "constitution_policy_violation",
    "tool_not_found",
    "version_mismatch",
    "session_expired",
    "lifecycle_conflict",
]

_CODE_TO_SYMBOL: dict[int, AEPErrorSymbol] = {
    -32000: "authn_failed",
    -32001: "authz_denied",
    -32002: "capability_not_supported",
    -32003: "ceiling_exceeded",
    -32004: "budget_exhausted",
    -32005: "tree_boundary_violation",
    -32006: "subject_not_found",
    -32007: "constitution_policy_violation",
    -32008: "tool_not_found",
    -32009: "version_mismatch",
    -32010: "session_expired",
    -32011: "lifecycle_conflict",
}

CODE_TO_SYMBOL = _CODE_TO_SYMBOL


class AEPError(Exception):
    def __init__(self, code: int, message: str, data: Any = None) -> None:
        super().__init__(message)
        self.code = code
        self.symbol: AEPErrorSymbol | str = _CODE_TO_SYMBOL.get(code, "unknown")
        self.data = data


class AEPAuthzError(AEPError):
    """Raised when the runtime rejects a method call because the caller's
    token lacks the required scope (JSON-RPC error code -32001). Catch this
    separately from generic AEPError to distinguish authz failures (e.g. show
    a 'this key needs scope X' UI hint) from other protocol errors."""

    def __init__(self, message: str, data: Any = None) -> None:
        super().__init__(code=-32001, message=message, data=data)


class AEPTransportError(Exception):
    def __init__(self, message: str, cause: Exception | None = None) -> None:
        super().__init__(message)
        self.cause = cause


def from_jsonrpc_error(payload: dict[str, Any]) -> AEPError:
    code = int(payload["code"])
    message = str(payload.get("message", ""))
    data = payload.get("data")
    if code == -32001:
        return AEPAuthzError(message=message, data=data)
    return AEPError(code=code, message=message, data=data)
