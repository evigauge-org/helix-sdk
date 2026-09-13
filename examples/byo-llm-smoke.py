#!/usr/bin/env python3
"""BYO LLM end-to-end smoke for Plan 7 (Python SDK)."""
from __future__ import annotations

import asyncio
import os
import sys
import time
from typing import Any

import httpx

from helix_sdk import HelixClient

BASE = os.environ.get("AEP_BASE_URL", "http://localhost:3000")
BEARER = os.environ.get("AEP_BEARER")
KIND = os.environ.get("PROVIDER_KIND")
KEY = os.environ.get("PROVIDER_API_KEY")
BASE_URL = os.environ.get("PROVIDER_BASE_URL")
MODEL = os.environ.get("PROVIDER_MODEL")


async def main() -> None:
    if not BEARER:
        raise SystemExit("AEP_BEARER required")
    if not KIND or not KEY or not MODEL:
        raise SystemExit("PROVIDER_KIND / PROVIDER_API_KEY / PROVIDER_MODEL required")
    if KIND == "openai_compat" and not BASE_URL:
        raise SystemExit("PROVIDER_BASE_URL required for openai_compat")

    headers = {"Authorization": f"Bearer {BEARER}"}

    async with httpx.AsyncClient(timeout=60) as http:
        print("\n— Step 1: create provider via REST")
        r = await http.post(
            f"{BASE}/api/me/llm-providers",
            headers={**headers, "Content-Type": "application/json"},
            json={
                "name": f"smoke-py-{int(time.time())}",
                "kind": KIND,
                "api_key": KEY,
                "base_url": BASE_URL,
                "default_model": MODEL,
            },
        )
        r.raise_for_status()
        prov = r.json()
        print(f"  ✓ provider {prov['id']}, hint={prov['api_key_hint']}")

        print("\n— Step 2: test connection")
        r = await http.post(f"{BASE}/api/me/llm-providers/{prov['id']}/test", headers=headers)
        r.raise_for_status()
        test = r.json()
        if not test.get("ok"):
            raise SystemExit(f"test failed: {test.get('kind')} — {test.get('message')}")
        print("  ✓ test ok")

        client = HelixClient(base_url=BASE, bearer=BEARER, http_client=http)

        print("\n— Step 3: AEP initialize")
        init = await client.initialize(
            requested_versions=["aep-2026-04-24"],
            requested_capabilities={"runner.byo_llm": True, "self.learning_memory": True},
            client_info={"name": "byo-llm-smoke-py", "version": "0.1.0"},
        )
        if not init["capabilities"].get("runner.byo_llm"):
            raise SystemExit("server didn't negotiate runner.byo_llm")
        print(f"  ✓ session {init['session_id']}, runner.byo_llm=true")

        print("\n— Step 4: provider.list via AEP")
        listed = await client.provider.list()
        if not listed.get("providers"):
            raise SystemExit("provider.list returned empty")
        for p in listed["providers"]:
            if p.get("api_key"):
                raise SystemExit("plaintext api_key leaked in provider.list")
        print(f"  ✓ {len(listed['providers'])} provider(s), no plaintext keys")

        print("\n— Step 5: agent.create with runner block")
        agent = await client.agent.create(
            name="BYO Smoke Agent (Py)",
            constitution={
                "immutable_directives": "Be concise.",
                "mutable_prompt": "Python smoke test.",
                "mutable_prompt_policy": "auto",
            },
            toolset=["helix.web_search"],
            ceilings={"max_cycles": 1, "max_subagents": 0, "max_tool_calls_per_cycle": 4, "max_wall_seconds": 60},
            budgets={"tokens_per_cycle": 2000, "tool_calls_per_cycle": 4, "seconds_per_cycle": 60},
            runner={"provider_id": prov["id"], "model": MODEL},
        )
        print(f"  ✓ agent {agent['id']}")

        print("\n— Step 6: run.create + poll")
        run = await client.run.create(agent_id=agent["id"], input={"kind": "text", "value": "say hello"})
        deadline = time.time() + 30
        tokens = 0
        while time.time() < deadline:
            fresh = await client.run.get(run_id=run["id"])
            if fresh.get("tokens_used", 0) > 0:
                tokens = fresh["tokens_used"]
                break
            if fresh.get("status") in ("complete", "stopped", "error"):
                break
            await asyncio.sleep(2)
        print(f"  ✓ {tokens} tokens recorded" if tokens else "  ! no tokens (cycle may not have ticked)")

        print("\n— Step 7: delete-blocked")
        r = await http.delete(f"{BASE}/api/me/llm-providers/{prov['id']}", headers=headers)
        if r.status_code != 409:
            raise SystemExit(f"expected 409, got {r.status_code}")
        print("  ✓ delete blocked while agent attached")

        print("\n— Step 8: detach + delete")
        await client.agent.update(agent_id=agent["id"], runner=None)
        r = await http.delete(f"{BASE}/api/me/llm-providers/{prov['id']}", headers=headers)
        if r.status_code != 204:
            raise SystemExit(f"expected 204 after detach, got {r.status_code}")
        print("  ✓ deleted")

        print("\n✓ BYO LLM smoke complete (Python).\n")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except SystemExit as e:
        print(f"\nSystemExit: {e}", file=sys.stderr)
        raise
    except Exception as e:  # noqa: BLE001
        print(f"\n{type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)
