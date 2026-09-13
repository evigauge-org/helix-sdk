# packages/python/helix_sdk/services/subject.py
from __future__ import annotations

from typing import Any, Literal

from ..capabilities import CapabilityGate
from ..transport import RpcClient


class SubjectService:
    def __init__(self, rpc: RpcClient, gate: CapabilityGate) -> None:
        self._rpc = rpc
        self._gate = gate

    async def export(self, subject_id: str) -> dict[str, Any]:
        self._gate.require("subject.export")
        return await self._rpc.call("subject.export", {"subject_id": subject_id})

    async def erase(self, subject_id: str, mode: Literal["hard_delete", "redact"]) -> dict[str, Any]:
        self._gate.require("subject.erase")
        return await self._rpc.call("subject.erase", {"subject_id": subject_id, "mode": mode})

    async def read(self, subject_id: str) -> dict[str, Any]:
        self._gate.require("subject.read")
        return await self._rpc.call("subject.read", {"subject_id": subject_id})
