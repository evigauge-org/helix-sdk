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

## Hacktoberfest

We welcome contributors during [Hacktoberfest](https://hacktoberfest.com/)
and the rest of the year. Note that **from 2026, Hacktoberfest no longer
counts pull requests toward its rewards.** The event now centres on events,
livestreams and challenges about open-source AI and open-weight models. A
pull request here won't earn you Hacktoberfest stickers, so contribute because
the work is worth doing.

What you do get:

- **A Certificate of Contribution** for every merged pull request, recording
  your name, the project, the pull request and the date (see section 5 of the
  [CLA](CLA.md)).
- **Real experience with AI-agent infrastructure.** This SDK is the client
  side of a wire protocol for running AI agents, including external MCP
  servers and bring-your-own LLM providers. That fits this year's
  open-source AI theme if you want something to build on or write about for a
  Hack Day or a DEV challenge.
- **Review from maintainers** on every pull request, not just a merge button.

How to take part:

- **Find work.** Look for issues labelled
  [`good first issue`](https://github.com/evigauge-org/helix-sdk/labels/good%20first%20issue)
  or [`hacktoberfest`](https://github.com/evigauge-org/helix-sdk/labels/hacktoberfest).
  Many of them (unit tests, documentation fixes) need no live runtime.
- **Claim it first.** Comment on the issue before you start, so two people
  don't do the same work. If you've claimed something and haven't opened a pull
  request within a week, we may hand it to someone else.
- **Bring your own ideas.** For anything beyond a small fix, open an issue or
  a [discussion](https://github.com/evigauge-org/helix-sdk/discussions) first so
  we can agree on the approach.
- **Quality over quantity.** Pull requests that only reformat code, touch
  generated files, or are machine-generated without being understood get
  labelled `spam` and closed.
- **Accept the CLA.** Without it, your first pull request can't be merged.

## What this repository is

Two client SDKs for the Agent Execution Protocol (AEP), the wire protocol
behind Helix:

| Path | Package | Registry |
|---|---|---|
| `packages/typescript` | `@helixsdk/core` | npm |
| `packages/python` | `helix-protocol` | PyPI |

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

## Examples

`examples/` holds runnable smoke tests that double as documentation. They
import by package name, and the Bun workspace resolves that to the local
source — so an example always exercises the code in your branch, not a
published release. If you change a public API, update the example that uses
it in the same pull request.

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
