# packages/python/helix_sdk/capabilities.py
from __future__ import annotations

from typing import Literal

from .errors import AEPError

Capability = Literal[
    "auth.oauth2",
    "compliance.gdpr",
    "tools.mcp_external",
    "self.modify_prompt",
    "self.spawn_subagent",
    "self.learning_memory",
    "messaging.peer",
    "streaming.sse",
    "runner.byo_llm",
]

METHOD_CAPABILITY: dict[str, Capability] = {
    "memory.read": "self.learning_memory",
    "memory.write": "self.learning_memory",
    "memory.search": "self.learning_memory",
    "memory.delete": "self.learning_memory",
    "message.send": "messaging.peer",
    "message.inbox": "messaging.peer",
    "message.list": "messaging.peer",
    "subject.export": "compliance.gdpr",
    "subject.erase": "compliance.gdpr",
    "subject.read": "compliance.gdpr",
    "agent.approve_prompt_change": "self.modify_prompt",
    "run.events": "streaming.sse",
    "provider.list": "runner.byo_llm",
}


class CapabilityGate:
    def __init__(self, advertised: set[Capability]) -> None:
        self._advertised = advertised

    @classmethod
    def from_server_response(cls, caps: dict[str, bool]) -> "CapabilityGate":
        return cls({name for name, enabled in caps.items() if enabled})  # type: ignore[arg-type]

    def has(self, cap: Capability) -> bool:
        return cap in self._advertised

    def require(self, method: str) -> None:
        cap = METHOD_CAPABILITY.get(method)
        if cap is not None and cap not in self._advertised:
            raise AEPError(
                -32002,
                f"Method {method} requires capability {cap}, not advertised by runtime",
            )

    def update(self, other: "CapabilityGate") -> None:
        self._advertised = set(other._advertised)
