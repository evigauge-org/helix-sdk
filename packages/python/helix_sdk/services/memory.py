# packages/python/helix_sdk/services/memory.py
from __future__ import annotations

from typing import Any

from ..capabilities import CapabilityGate
from ..transport import RpcClient


class MemoryService:
    def __init__(self, rpc: RpcClient, gate: CapabilityGate) -> None:
        self._rpc = rpc
        self._gate = gate

    async def read(
        self,
        tree_root_id: str,
        namespace: str,
        key: str | None = None,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        self._gate.require("memory.read")
        body: dict[str, Any] = {"tree_root_id": tree_root_id, "namespace": namespace}
        if key is not None:
            body["key"] = key
        if limit is not None:
            body["limit"] = limit
        if cursor is not None:
            body["cursor"] = cursor
        return await self._rpc.call("memory.read", body)

    async def write(
        self,
        tree_root_id: str,
        namespace: str,
        key: str,
        value: Any,
        subject_id: str | None = None,
        ttl_seconds: int | None = None,
    ) -> dict[str, Any]:
        self._gate.require("memory.write")
        body: dict[str, Any] = {
            "tree_root_id": tree_root_id,
            "namespace": namespace,
            "key": key,
            "value": value,
        }
        if subject_id is not None:
            body["subject_id"] = subject_id
        if ttl_seconds is not None:
            body["ttl_seconds"] = ttl_seconds
        return await self._rpc.call("memory.write", body)

    async def search(
        self,
        tree_root_id: str,
        namespace: str,
        query: str,
        k: int | None = None,
    ) -> dict[str, Any]:
        self._gate.require("memory.search")
        body: dict[str, Any] = {"tree_root_id": tree_root_id, "namespace": namespace, "query": query}
        if k is not None:
            body["k"] = k
        return await self._rpc.call("memory.search", body)

    async def delete(self, **params: Any) -> dict[str, Any]:
        self._gate.require("memory.delete")
        return await self._rpc.call("memory.delete", params)
