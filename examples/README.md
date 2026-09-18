# Examples

Runnable smoke tests for the Helix SDK. Each one exercises a slice of the
Agent Execution Protocol against a live runtime, and each is written the way
you would actually use the SDK — importing by package name, not by relative
path.

| File | What it covers |
|---|---|
| `aep-smoke.ts` | Core handshake: initialize, capability negotiation, agent and run lifecycle |
| `oauth-smoke.ts` | OAuth 2.0 authorisation-code flow with PKCE, end to end |
| `mcp-smoke.ts` | External MCP server registration and invocation |
| `byo-llm-smoke.ts` | Bring-your-own LLM provider configuration (TypeScript) |
| `byo-llm-smoke.py` | The same, in Python |
| `gdpr-smoke.ts` | Subject export and erasure under the `compliance.gdpr` capability |

## Running them

These talk to a **live runtime**. Point them at one and give them a token:

```bash
export AEP_BASE_URL="http://localhost:3000"
export HELIX_ADMIN_API_KEY="hlx_..."
```

TypeScript — the workspace resolves `@helixsdk/core` to `packages/typescript`,
so you are running the local source, not a published release:

```bash
bun install          # from the repository root
bun run examples/aep-smoke.ts
```

Python:

```bash
cd packages/python && uv sync --extra dev
uv run python ../../examples/byo-llm-smoke.py
```

## A warning

These are **not** read-only. They create agents, start runs, register OAuth
clients and, in the case of `gdpr-smoke.ts`, erase subject data. Run them
against a development runtime. Never against production.

