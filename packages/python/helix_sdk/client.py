# packages/python/helix_sdk/client.py
from __future__ import annotations

from typing import Any

import httpx

from .capabilities import Capability, CapabilityGate
from .constants import PROTOCOL_VERSION
from .errors import AEPError
from .services import (
    AgentService,
    ArtifactService,
    MemoryService,
    MessageService,
    ProviderService,
    RunService,
    SubjectService,
)
from .transport import BinaryClient, RpcClient, SseClient


class HelixClient:
    def __init__(
        self,
        base_url: str,
        bearer: str,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._http = http_client or httpx.AsyncClient(timeout=httpx.Timeout(60.0, read=None))
        self._owns_http = http_client is None

        self._rpc = RpcClient(base_url=base_url, bearer=bearer, http_client=self._http)
        self._sse = SseClient(base_url=base_url, bearer=bearer, http_client=self._http)
        self._bin = BinaryClient(base_url=base_url, bearer=bearer, http_client=self._http)
        self._gate = CapabilityGate(set())

        self.agent = AgentService(self._rpc, self._gate)
        self.run = RunService(self._rpc, self._sse, self._gate)
        self.artifact = ArtifactService(self._rpc, self._bin)
        self.memory = MemoryService(self._rpc, self._gate)
        self.message = MessageService(self._rpc, self._gate)
        self.provider = ProviderService(self._rpc, self._gate)
        self.subject = SubjectService(self._rpc, self._gate)

    async def __aenter__(self) -> "HelixClient":
        return self

    async def __aexit__(self, *exc_info: Any) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        if self._owns_http:
            await self._http.aclose()

    async def initialize(
        self,
        requested_versions: list[str],
        requested_capabilities: dict[Capability, bool],
        client_info: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        result = await self._rpc.call(
            "initialize",
            {
                "client_info": client_info or {"name": "helix-protocol", "version": "0.1.0a0"},
                "requested_versions": requested_versions,
                "requested_capabilities": requested_capabilities,
            },
        )
        if result["protocol_version"] != PROTOCOL_VERSION:
            raise AEPError(
                -32009,
                f"Runtime reports protocol {result['protocol_version']}, SDK expects {PROTOCOL_VERSION}",
            )
        self._rpc.set_session_id(result["session_id"])
        self._gate.update(CapabilityGate.from_server_response(result["capabilities"]))
        return result
