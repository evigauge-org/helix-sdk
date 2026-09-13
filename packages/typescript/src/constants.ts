// packages/typescript/src/constants.ts

export const PROTOCOL_VERSION = "aep-2026-04-24" as const;

export const HEADER_PROTOCOL_VERSION = "Agent-Protocol-Version" as const;
export const HEADER_SESSION_ID = "X-AEP-Session-Id" as const;

export const RPC_PATH = "/aep/v1/rpc" as const;
export const RUN_EVENTS_PATH = (runId: string) => `/aep/v1/runs/${encodeURIComponent(runId)}/events`;
export const ARTIFACT_BYTES_PATH = (artifactId: string) =>
  `/aep/v1/artifacts/${encodeURIComponent(artifactId)}/bytes`;
