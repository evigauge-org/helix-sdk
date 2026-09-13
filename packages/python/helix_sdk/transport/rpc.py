# packages/python/helix_sdk/transport/rpc.py
from __future__ import annotations

import json
from typing import Any

import httpx

from ..constants import HEADER_PROTOCOL_VERSION, HEADER_SESSION_ID, PROTOCOL_VERSION, RPC_PATH
from ..errors import AEPTransportError, from_jsonrpc_error


class RpcClient:
    def __init__(self, base_url: str, bearer: str, http_client: httpx.AsyncClient | None = None) -> None:
        self._base_url = base_url.rstrip("/")
        self._bearer = bearer
        self._next_id = 1
        self._session_id: str | None = None
        self._client = http_client or httpx.AsyncClient(timeout=httpx.Timeout(60.0, read=None))
        self._owns_client = http_client is None

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    def set_session_id(self, session_id: str) -> None:
        self._session_id = session_id

    def get_session_id(self) -> str | None:
        return self._session_id

    async def call(self, method: str, params: Any | None = None) -> Any:
        req_id = self._next_id
        self._next_id += 1
        body: dict[str, Any] = {"jsonrpc": "2.0", "id": req_id, "method": method}
        if params is not None:
            body["params"] = params

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {self._bearer}",
            HEADER_PROTOCOL_VERSION: PROTOCOL_VERSION,
        }
        if self._session_id:
            headers[HEADER_SESSION_ID] = self._session_id

        try:
            resp = await self._client.post(
                f"{self._base_url}{RPC_PATH}",
                headers=headers,
                content=json.dumps(body),
            )
        except httpx.HTTPError as e:
            raise AEPTransportError("Network error during RPC call", cause=e) from e

        if resp.status_code >= 500:
            raise AEPTransportError(f"HTTP {resp.status_code} {resp.reason_phrase}")

        try:
            payload = resp.json()
        except json.JSONDecodeError as e:
            raise AEPTransportError("Failed to parse JSON-RPC response", cause=e) from e

        if "error" in payload and payload["error"]:
            raise from_jsonrpc_error(payload["error"])
        if "result" not in payload:
            raise AEPTransportError("JSON-RPC response missing result and error")
        return payload["result"]
