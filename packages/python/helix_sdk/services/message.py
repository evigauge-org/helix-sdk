# packages/python/helix_sdk/services/message.py
from __future__ import annotations

from typing import Any

from ..capabilities import CapabilityGate
from ..transport import RpcClient


class MessageService:
    def __init__(self, rpc: RpcClient, gate: CapabilityGate) -> None:
        self._rpc = rpc
        self._gate = gate

    async def send(self, to_agent_id: str, body: Any) -> dict[str, Any]:
        self._gate.require("message.send")
        return await self._rpc.call("message.send", {"to_agent_id": to_agent_id, "body": body})

    async def inbox(self, agent_id: str) -> dict[str, Any]:
        self._gate.require("message.inbox")
        return await self._rpc.call("message.inbox", {"agent_id": agent_id})

    async def list(self, **params: Any) -> dict[str, Any]:
        self._gate.require("message.list")
        return await self._rpc.call("message.list", params)
