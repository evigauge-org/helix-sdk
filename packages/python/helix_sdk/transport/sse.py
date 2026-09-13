# packages/python/helix_sdk/transport/sse.py
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, AsyncIterator

import httpx

from ..constants import HEADER_PROTOCOL_VERSION, HEADER_SESSION_ID, PROTOCOL_VERSION, run_events_path
from ..errors import AEPTransportError


@dataclass
class SseEvent:
    event_id: str
    run_id: str
    type: str
    emitted_at: str
    payload: Any


class SseClient:
    def __init__(self, base_url: str, bearer: str, http_client: httpx.AsyncClient | None = None) -> None:
        self._base_url = base_url.rstrip("/")
        self._bearer = bearer
        self._client = http_client or httpx.AsyncClient(timeout=httpx.Timeout(60.0, read=None))
        self._owns_client = http_client is None

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def stream(
        self,
        run_id: str,
        session_id: str | None,
        since: str | None = None,
    ) -> AsyncIterator[SseEvent]:
        headers = {
            "Accept": "text/event-stream",
            "Authorization": f"Bearer {self._bearer}",
            HEADER_PROTOCOL_VERSION: PROTOCOL_VERSION,
        }
        if session_id:
            headers[HEADER_SESSION_ID] = session_id

        params = {"since": since} if since else None

        async with self._client.stream(
            "GET",
            f"{self._base_url}{run_events_path(run_id)}",
            headers=headers,
            params=params,
        ) as resp:
            if resp.status_code != 200:
                raise AEPTransportError(f"SSE HTTP {resp.status_code} {resp.reason_phrase}")

            buf = ""
            async for chunk in resp.aiter_text():
                buf += chunk
                while "\n\n" in buf:
                    frame, buf = buf.split("\n\n", 1)
                    parsed = _parse_frame(frame)
                    if parsed is not None:
                        yield parsed


def _parse_frame(raw: str) -> SseEvent | None:
    event_type = "message"
    data_line = ""
    for line in raw.split("\n"):
        if line.startswith("event:"):
            event_type = line[6:].strip()
        elif line.startswith("data:"):
            data_line += line[5:].strip()
    if not data_line:
        return None
    try:
        parsed = json.loads(data_line)
    except json.JSONDecodeError:
        return None
    return SseEvent(
        event_id=str(parsed.get("event_id", "")),
        run_id=str(parsed.get("run_id", "")),
        type=str(parsed.get("type", event_type)),
        emitted_at=str(parsed.get("emitted_at", "")),
        payload=parsed.get("payload", parsed),
    )
