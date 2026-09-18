# helix-protocol

Python client SDK for the **Agent Execution Protocol** (AEP).

This package speaks the `aep-2026-04-24` wire protocol to any conforming runtime. It is a pure client — no server, no framework integrations.

## Install

```bash
uv add helix-protocol
# or
pip install helix-protocol
```

## Usage

```python
import asyncio
from helix_sdk import HelixClient

async def main():
    async with HelixClient(base_url="https://runtime.example.com", bearer="...") as client:
        await client.initialize(
            requested_versions=["aep-2026-04-24"],
            requested_capabilities={"compliance.gdpr": True, "messaging.peer": True},
        )
        agent = await client.agent.create(...)
        run = await client.run.create(agent_id=agent.id, goal="...")
        async for event in client.run.events(run.id):
            print(event.type, event)

asyncio.run(main())
```

## Codegen

Pydantic models are generated from the canonical JSON Schema bundle at `docs/protocol/schemas/`. To regenerate:

```bash
uv run python scripts/generate_models.py
```

Do not hand-edit `helix_sdk/models/generated.py`.

## License

Apache-2.0.
