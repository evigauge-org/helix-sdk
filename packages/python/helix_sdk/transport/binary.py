# packages/python/helix_sdk/transport/binary.py
from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncIterator

import httpx

from ..constants import HEADER_PROTOCOL_VERSION, HEADER_SESSION_ID, PROTOCOL_VERSION, artifact_bytes_path
from ..errors import AEPTransportError


@dataclass
class BinaryResult:
    mime_type: str
    size: int
    body: AsyncIterator[bytes]


class BinaryClient:
    def __init__(self, base_url: str, bearer: str, http_client: httpx.AsyncClient | None = None) -> None:
        self._base_url = base_url.rstrip("/")
        self._bearer = bearer
        self._client = http_client or httpx.AsyncClient(timeout=httpx.Timeout(60.0, read=None))
        self._owns_client = http_client is None

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def fetch_artifact_bytes(self, artifact_id: str, session_id: str | None) -> BinaryResult:
        headers = {
            "Authorization": f"Bearer {self._bearer}",
            HEADER_PROTOCOL_VERSION: PROTOCOL_VERSION,
        }
        if session_id:
            headers[HEADER_SESSION_ID] = session_id

        req = self._client.build_request(
            "GET",
            f"{self._base_url}{artifact_bytes_path(artifact_id)}",
            headers=headers,
        )
        resp = await self._client.send(req, stream=True)
        if resp.status_code != 200:
            await resp.aclose()
            raise AEPTransportError(f"Binary HTTP {resp.status_code} {resp.reason_phrase}")

        mime = resp.headers.get("Content-Type", "application/octet-stream")
        size = int(resp.headers.get("Content-Length", "0") or 0)

        async def iterator() -> AsyncIterator[bytes]:
            try:
                async for chunk in resp.aiter_bytes():
                    yield chunk
            finally:
                await resp.aclose()

        return BinaryResult(mime_type=mime, size=size, body=iterator())
