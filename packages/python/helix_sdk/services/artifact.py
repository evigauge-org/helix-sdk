# packages/python/helix_sdk/services/artifact.py
from __future__ import annotations

from typing import Any

from ..transport import BinaryClient, BinaryResult, RpcClient


class ArtifactService:
    def __init__(self, rpc: RpcClient, binary: BinaryClient) -> None:
        self._rpc = rpc
        self._binary = binary

    async def get(self, artifact_id: str) -> dict[str, Any]:
        return await self._rpc.call("artifact.get", {"artifact_id": artifact_id})

    async def list(self, **params: Any) -> dict[str, Any]:
        return await self._rpc.call("artifact.list", params)

    async def delete(self, artifact_id: str) -> dict[str, Any]:
        return await self._rpc.call("artifact.delete", {"artifact_id": artifact_id})

    async def bytes(self, artifact_id: str) -> BinaryResult:
        return await self._binary.fetch_artifact_bytes(artifact_id, self._rpc_session())

    def _rpc_session(self) -> str | None:
        # Router for the session id held in the RpcClient; kept as a method
        # so both call sites share a single lookup strategy.
        return self._rpc.get_session_id()
