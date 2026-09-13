# Contributing to the Helix SDK

Thanks for taking the time. This document covers what you need to know before
opening a pull request.

## Before you start

**You must accept the [Contributor Licence Agreement](CLA.md).** A bot will
comment on your first pull request with the text to post. Merging is blocked
until acceptance is recorded. The short version: you assign copyright in your
contribution to Evigauge Technologies Pvt. Ltd., you keep the right to use your
own work anywhere else, and you get a Certificate of Contribution when your
pull request is merged.

Read it properly before accepting — it is a real agreement, not a formality.

## What this repository is

Two client SDKs for the Agent Execution Protocol (AEP), the wire protocol
behind Helix:

| Path | Package | Registry |
|---|---|---|
| `packages/typescript` | `@helixsdk/core` | npm |
| `packages/python` | `helixsdk` | PyPI |

Both are **pure clients**. No server, no UI, no framework integrations. A
change that adds a framework adapter or a server component belongs somewhere
else — open an issue first and we will point you at the right place.

The two SDKs are deliberately kept in step. A change to one usually needs the
mirror change in the other; say so in your pull request if you are only doing
half, so a maintainer can pick up the rest.

## The rule that will trip you up

**Wire-protocol constants must not be renamed or changed** without a
corresponding protocol version bump agreed in an issue first. These values are
matched by the server; changing one silently breaks every deployed client:

- `PROTOCOL_VERSION` — currently `aep-2026-04-24`
- `HEADER_PROTOCOL_VERSION` — `Agent-Protocol-Version`
- `HEADER_SESSION_ID` — `X-AEP-Session-Id`
- `RPC_PATH` and the run-events and artifact-bytes path builders

The `AEP` prefix on error classes is likewise a protocol name, not a leftover.
Leave it alone.

## Setup

TypeScript:

```bash
cd packages/typescript
bun install
bun run generate   # regenerates src/types/generated.ts from the protocol schema
bun run build
```

Python:

```bash
cd packages/python
uv sync --extra dev
uv run python scripts/generate_models.py   # regenerates helix_sdk/models/generated.py
uv run ruff check .
```

Generated files are not committed. Both are gitignored and rebuilt from the
protocol schema, so never hand-edit them — your edit will be silently
overwritten.

## Pull requests

1. Branch off `main`.
2. Keep the change focused. One concern per pull request.
3. Make sure it builds: `tsc -p tsconfig.json --noEmit` for TypeScript,
   `ruff check .` for Python.
4. Mirror the change in the other language, or say explicitly that you haven't.
5. Write a description that explains *why*, not just *what*. The diff already
   says what.

CI runs the typecheck, the lint and the build on every pull request. Get it
green before asking for review.

## Reporting bugs

Open an issue with the SDK and version, the protocol version, what you
expected, what happened, and the smallest reproduction you can manage. A
reproduction is worth more than a description.

For anything security-related, do **not** open an issue. See
[SECURITY.md](SECURITY.md).

## Questions

Open a discussion, or email info@evigauge.com.
