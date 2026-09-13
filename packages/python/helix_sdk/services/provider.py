# packages/python/helix_sdk/services/provider.py
from __future__ import annotations

from typing import Any

from ..capabilities import CapabilityGate
from ..transport import RpcClient


class ProviderService:
    def __init__(self, rpc: RpcClient, gate: CapabilityGate) -> None:
        self._rpc = rpc
        self._gate = gate

    async def list(self) -> dict[str, Any]:
        self._gate.require("provider.list")
        return await self._rpc.call("provider.list", {})
