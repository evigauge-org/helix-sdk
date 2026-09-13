// packages/typescript/src/index.ts
export { HelixClient } from "./client.js";
/** @deprecated Renamed to `HelixClient`. Kept for callers written before the rename. */
export { HelixClient as AEPClient } from "./client.js";
export type { HelixClientConfig, InitializeParams, InitializeResult } from "./client.js";
export { AEPError, AEPAuthzError, AEPTransportError } from "./errors.js";
export type { AEPErrorSymbol } from "./errors.js";
export type { Capability } from "./capabilities.js";
export { PROTOCOL_VERSION } from "./constants.js";

export type {
  AgentService,
  AgentCreateParams,
  AgentGetParams,
  AgentListParams,
  AgentListResult,
  AgentUpdateParams,
  AgentApprovePromptChangeParams,
  AgentRecord,
  ExternalMcpServerAuth,
  ExternalMcpServerSpec,
  ExternalMcpServerView,
} from "./services/agent.js";
export type {
  RunService,
  RunCreateParams,
  RunListParams,
  RunListResult,
  RunRecord,
  RunEventsOptions,
} from "./services/run.js";
export type {
  ArtifactService,
  ArtifactListParams,
  ArtifactListResult,
  ArtifactRecord,
} from "./services/artifact.js";
export type {
  MemoryService,
  MemoryRecord,
  MemoryReadParams,
  MemoryReadResult,
  MemoryWriteParams,
  MemorySearchParams,
  MemorySearchResult,
  MemoryDeleteParams,
} from "./services/memory.js";
export type {
  MessageService,
  MessageRecord,
  MessageSendParams,
  MessageInboxParams,
  MessageInboxResult,
  MessageListParams,
  MessageListResult,
} from "./services/message.js";
export type {
  SubjectService,
  SubjectExportResult,
  SubjectEraseParams,
  ErasureManifest,
} from "./services/subject.js";

export type { SseEvent } from "./transport/sse.js";
export type { BinaryResult } from "./transport/binary.js";
