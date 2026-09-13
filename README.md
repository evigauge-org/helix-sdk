# Helix SDK

Client SDKs for the **Agent Execution Protocol** (AEP) — the wire protocol
behind [Helix](https://evigauge.com) by Evigauge Technologies Pvt. Ltd.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@helixsdk/core.svg)](https://www.npmjs.com/package/@helixsdk/core)
[![PyPI](https://img.shields.io/pypi/v/helixsdk.svg)](https://pypi.org/project/helixsdk/)

| Language | Package | Source |
|---|---|---|
| TypeScript | [`@helixsdk/core`](https://www.npmjs.com/package/@helixsdk/core) | [`packages/typescript`](packages/typescript) |
| Python | [`helixsdk`](https://pypi.org/project/helixsdk/) | [`packages/python`](packages/python) |

Both are pure clients — no server, no UI, no framework glue. They speak the
`aep-2026-04-24` wire protocol to any conforming runtime, and they are kept
feature-equivalent on purpose, so a snippet in one language reads the same in
the other.

## Install

```bash
npm install @helixsdk/core     # or: bun add @helixsdk/core
pip install helixsdk           # or: uv add helixsdk
```

## Usage

**TypeScript**

```ts
import { HelixClient } from "@helixsdk/core";

const client = new HelixClient({
  baseUrl: "https://runtime.example.com",
  auth: { bearer: process.env.HELIX_TOKEN! },
});

await client.initialize({
  requestedVersions: ["aep-2026-04-24"],
  requestedCapabilities: { "compliance.gdpr": true, "messaging.peer": true },
});

const agent = await client.agent.create({ /* ... */ });
const run = await client.run.create({ agent_id: agent.id, goal: "..." });

for await (const event of client.run.events(run.id)) {
  console.log(event.type, event);
}
```

**Python**

```python
import asyncio
from helix_sdk import HelixClient

async def main():
    async with HelixClient(
        base_url="https://runtime.example.com",
        bearer="...",
    ) as client:
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

Note the Python **import** name is `helix_sdk` while the **distribution** name
is `helixsdk`. That is deliberate and normal — the two namespaces are separate
on PyPI.

## Services

Both clients expose the same seven services off the root object:

| Service | What it covers |
|---|---|
| `agent` | Create, read, update and list agents; external MCP server specs |
| `run` | Start runs and stream their events |
| `artifact` | List run artifacts and fetch their bytes |
| `memory` | Read, write, search and delete agent memory |
| `message` | Peer-to-peer agent messaging and inbox |
| `provider` | Bring-your-own LLM provider configuration |
| `subject` | GDPR subject export and erasure |

## Protocol compatibility

The SDKs pin a protocol version and negotiate capabilities at `initialize`.
The constants in `constants.ts` / `constants.py` — the protocol version, the
`Agent-Protocol-Version` and `X-AEP-Session-Id` headers, and the RPC and
streaming paths — are matched by the server. They are not cosmetic and are not
renamed across releases without a protocol version bump.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first, and
note that you will need to accept the [Contributor Licence
Agreement](CLA.md) before your first pull request can be merged. When it
merges, you receive a Certificate of Contribution.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

Security issues go to info@evigauge.com, never to the issue tracker — see
[SECURITY.md](SECURITY.md).

## Licence

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

The Helix runtime and the Helix application are **separately licensed** and are
not covered by this repository's licence.

### Trademarks

"Helix" and "Evigauge" are trademarks of Evigauge Technologies Pvt. Ltd.
Section 6 of the Apache License grants no permission to use them. You may state
factually that your software uses or is compatible with the Helix SDK. You may
not use the names or logos to name your own product, to brand a fork, or in any
way suggesting endorsement.

---

Copyright 2026 Evigauge Technologies Pvt. Ltd.
