# packages/python/helix_sdk/services/run.py
from __future__ import annotations

from typing import Any, AsyncIterator

from ..capabilities import CapabilityGate
from ..transport import RpcClient, SseClient, SseEvent


class RunService:
    def __init__(self, rpc: RpcClient, sse: SseClient, gate: CapabilityGate) -> None:
        self._rpc = rpc
        self._sse = sse
        self._gate = gate

    async def create(self, agent_id: str, goal: str, **opts: Any) -> dict[str, Any]:
        body: dict[str, Any] = {"agent_id": agent_id, "goal": goal, **opts}
        return await self._rpc.call("run.create", body)

    async def get(self, run_id: str) -> dict[str, Any]:
        return await self._rpc.call("run.get", {"run_id": run_id})

    async def list(self, agent_id: str, **opts: Any) -> dict[str, Any]:
        return await self._rpc.call("run.list", {"agent_id": agent_id, **opts})

    async def cancel(self, run_id: str) -> dict[str, Any]:
        return await self._rpc.call("run.cancel", {"run_id": run_id})

    async def continue_(self, run_id: str) -> dict[str, Any]:
        return await self._rpc.call("run.continue", {"run_id": run_id})

    async def events(self, run_id: str, since: str | None = None) -> AsyncIterator[SseEvent]:
        self._gate.require("run.events")
        async for ev in self._sse.stream(run_id, self._rpc.get_session_id(), since=since):
            yield ev
