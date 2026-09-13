// packages/typescript/src/client.ts
import { RpcClient, type AuthBearer, type TransportConfig } from "./transport/rpc.js";
import { SseClient } from "./transport/sse.js";
import { BinaryClient } from "./transport/binary.js";
import { CapabilityGate, type Capability } from "./capabilities.js";
import { AEPError } from "./errors.js";
import { PROTOCOL_VERSION } from "./constants.js";

import { createAgentService, type AgentService } from "./services/agent.js";
import { createRunService, type RunService } from "./services/run.js";
import { createArtifactService, type ArtifactService } from "./services/artifact.js";
import { createMemoryService, type MemoryService } from "./services/memory.js";
import { createMessageService, type MessageService } from "./services/message.js";
import { createSubjectService, type SubjectService } from "./services/subject.js";
import { createProviderService, type ProviderService } from "./services/provider.js";

export interface HelixClientConfig {
  baseUrl: string;
  auth: AuthBearer;
  fetch?: typeof fetch;
}

export interface InitializeParams {
  clientInfo?: { name: string; version: string };
  requestedVersions: string[];
  requestedCapabilities: Partial<Record<Capability, boolean>>;
}

export interface InitializeResult {
  server_info: { name: string; version: string };
  protocol_version: string;
  capabilities: Record<string, boolean>;
  session_id: string;
}

export class HelixClient {
  private readonly rpc: RpcClient;
  private readonly sse: SseClient;
  private readonly bin: BinaryClient;
  private gate: CapabilityGate = new CapabilityGate(new Set());

  readonly agent!: AgentService;
  readonly run!: RunService;
  readonly artifact!: ArtifactService;
  readonly memory!: MemoryService;
  readonly message!: MessageService;
  readonly subject!: SubjectService;
  readonly provider!: ProviderService;

  constructor(config: HelixClientConfig) {
    const transport: TransportConfig = {
      baseUrl: config.baseUrl,
      auth: config.auth,
      ...(config.fetch !== undefined ? { fetch: config.fetch } : {}),
    };
    this.rpc = new RpcClient(transport);
    this.sse = new SseClient({
      baseUrl: config.baseUrl,
      bearer: config.auth.bearer,
      ...(config.fetch !== undefined ? { fetch: config.fetch } : {}),
    });
    this.bin = new BinaryClient({
      baseUrl: config.baseUrl,
      bearer: config.auth.bearer,
      ...(config.fetch !== undefined ? { fetch: config.fetch } : {}),
    });

    const getSession = () => this.rpc.getSessionId();
    (this as { agent: AgentService }).agent = createAgentService(this.rpc, this.gate);
    (this as { run: RunService }).run = createRunService(this.rpc, this.sse, this.gate, getSession);
    (this as { artifact: ArtifactService }).artifact = createArtifactService(this.rpc, this.bin, getSession);
    (this as { memory: MemoryService }).memory = createMemoryService(this.rpc, this.gate);
    (this as { message: MessageService }).message = createMessageService(this.rpc, this.gate);
    (this as { subject: SubjectService }).subject = createSubjectService(this.rpc, this.gate);
    (this as { provider: ProviderService }).provider = createProviderService(this.rpc, this.gate);
  }

  async initialize(params: InitializeParams): Promise<InitializeResult> {
    const result = await this.rpc.call<InitializeResult>("initialize", {
      client_info: params.clientInfo ?? { name: "@helixsdk/core", version: "0.1.0-alpha.0" },
      requested_versions: params.requestedVersions,
      requested_capabilities: params.requestedCapabilities,
    });
    if (result.protocol_version !== PROTOCOL_VERSION) {
      throw new AEPError(
        -32009,
        `Runtime reports protocol ${result.protocol_version}, SDK expects ${PROTOCOL_VERSION}`,
      );
    }
    this.rpc.setSessionId(result.session_id);
    const newGate = CapabilityGate.fromServerResponse(result.capabilities);
    Object.assign(this.gate, newGate);
    return result;
  }
}
