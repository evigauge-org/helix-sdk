# packages/python/helix_sdk/services/agent.py
from __future__ import annotations

from typing import Any

from ..capabilities import CapabilityGate
from ..transport import RpcClient


class AgentService:
    def __init__(self, rpc: RpcClient, gate: CapabilityGate) -> None:
        self._rpc = rpc
        self._gate = gate

    async def create(self, **params: Any) -> dict[str, Any]:
        """Create an agent. See AEP spec for accepted params.

        Notable Plan-7 addition: pass `runner={"provider_id": "...", "model": "..."}`
        to use a BYO LLM provider configured via /settings/llm-providers.
        Omit `runner` for managed (OpenRouter) execution.
        """
        return await self._rpc.call("agent.create", params)

    async def get(self, agent_id: str, include: list[str] | None = None, prompt_history_cursor: str | None = None) -> dict[str, Any]:
        body: dict[str, Any] = {"agent_id": agent_id}
        if include is not None:
            body["include"] = include
        if prompt_history_cursor is not None:
            body["prompt_history_cursor"] = prompt_history_cursor
        return await self._rpc.call("agent.get", body)

    async def list(self, **params: Any) -> dict[str, Any]:
        return await self._rpc.call("agent.list", params)

    async def update(self, agent_id: str, **changes: Any) -> dict[str, Any]:
        body = {"agent_id": agent_id, **changes}
        return await self._rpc.call("agent.update", body)

    async def approve_prompt_change(
        self,
        agent_id: str,
        pending_change_id: str,
        approve: bool,
        comment: str | None = None,
    ) -> dict[str, Any]:
        self._gate.require("agent.approve_prompt_change")
        body: dict[str, Any] = {
            "agent_id": agent_id,
            "pending_change_id": pending_change_id,
            "approve": approve,
        }
        if comment is not None:
            body["comment"] = comment
        return await self._rpc.call("agent.approve_prompt_change", body)

    async def cancel(self, agent_id: str) -> dict[str, Any]:
        return await self._rpc.call("agent.cancel", {"agent_id": agent_id})

    async def archive(self, agent_id: str) -> dict[str, Any]:
        return await self._rpc.call("agent.archive", {"agent_id": agent_id})
