## What this changes

<!-- Explain why, not just what. The diff already says what. -->

## Related issue

<!-- Closes #123 -->

## Language parity

The two SDKs are kept feature-equivalent. Tick one:

- [ ] Changed in both TypeScript and Python
- [ ] TypeScript only — the Python mirror is not needed, because:
- [ ] Python only — the TypeScript mirror is not needed, because:
- [ ] TypeScript only — **the Python mirror is still needed** and I am asking a maintainer to pick it up
- [ ] Python only — **the TypeScript mirror is still needed** and I am asking a maintainer to pick it up

## Checklist

- [ ] I have read [CONTRIBUTING.md](../blob/main/CONTRIBUTING.md)
- [ ] I have accepted the [Contributor Licence Agreement](../blob/main/CLA.md)
- [ ] It builds: `tsc -p tsconfig.json --noEmit` / `ruff check .`
- [ ] I have **not** changed any wire-protocol constant (`PROTOCOL_VERSION`, the
      `Agent-Protocol-Version` or `X-AEP-Session-Id` headers, or the RPC /
      run-events / artifact-bytes paths). If I have, an issue agreeing the
      protocol version bump is linked above.
- [ ] I have not hand-edited a generated file (`src/types/generated.ts`,
      `helix_sdk/models/generated.py`)
