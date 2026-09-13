# @helixsdk/core

TypeScript client SDK for the **Agent Execution Protocol** (AEP).

This package speaks the `aep-2026-04-24` wire protocol to any conforming runtime. It is a pure client — no server, no UI, no framework helpers.

## Install

```bash
bun add @helixsdk/core
```

## Usage

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

const agent = await client.agent.create({ ... });
const run = await client.run.create({ agent_id: agent.id, goal: "..." });

for await (const event of client.run.events(run.id)) {
  console.log(event.type, event);
}
```

## Codegen

Types are generated from the canonical JSON Schema bundle at `docs/protocol/schemas/`. To regenerate:

```bash
bun run generate
```

Do not hand-edit `src/types/generated.ts`.

## License

Apache-2.0.
