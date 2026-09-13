# packages/python/helix_sdk/constants.py
from __future__ import annotations

PROTOCOL_VERSION = "aep-2026-04-24"

HEADER_PROTOCOL_VERSION = "Agent-Protocol-Version"
HEADER_SESSION_ID = "X-AEP-Session-Id"

RPC_PATH = "/aep/v1/rpc"


def run_events_path(run_id: str) -> str:
    from urllib.parse import quote
    return f"/aep/v1/runs/{quote(run_id, safe='')}/events"


def artifact_bytes_path(artifact_id: str) -> str:
    from urllib.parse import quote
    return f"/aep/v1/artifacts/{quote(artifact_id, safe='')}/bytes"
