// packages/typescript/src/capabilities.ts
import { AEPError } from "./errors.js";

export type Capability =
  | "auth.oauth2"
  | "compliance.gdpr"
  | "tools.mcp_external"
  | "self.modify_prompt"
  | "self.spawn_subagent"
  | "self.learning_memory"
  | "messaging.peer"
  | "streaming.sse"
  | "runner.byo_llm";

/**
 * Maps SDK method names to the capability that must be negotiated in `initialize`
 * before they may be called. Methods not listed here require no capability beyond baseline.
 */
export const METHOD_CAPABILITY: Partial<Record<string, Capability>> = {
  "memory.read": "self.learning_memory",
  "memory.write": "self.learning_memory",
  "memory.search": "self.learning_memory",
  "memory.delete": "self.learning_memory",
  "message.send": "messaging.peer",
  "message.inbox": "messaging.peer",
  "message.list": "messaging.peer",
  "subject.export": "compliance.gdpr",
  "subject.erase": "compliance.gdpr",
  "subject.read": "compliance.gdpr",
  "agent.approve_prompt_change": "self.modify_prompt",
  "run.events": "streaming.sse",
  "provider.list": "runner.byo_llm",
};

export class CapabilityGate {
  constructor(private readonly advertised: ReadonlySet<Capability>) {}

  static fromServerResponse(caps: Record<string, boolean>): CapabilityGate {
    const set = new Set<Capability>();
    for (const [k, v] of Object.entries(caps)) {
      if (v) set.add(k as Capability);
    }
    return new CapabilityGate(set);
  }

  has(cap: Capability): boolean {
    return this.advertised.has(cap);
  }

  require(method: string): void {
    const cap = METHOD_CAPABILITY[method];
    if (cap && !this.advertised.has(cap)) {
      throw new AEPError(
        -32002,
        `Method ${method} requires capability ${cap}, not advertised by runtime`,
      );
    }
  }
}
