// packages/typescript/src/services/provider.ts
import type { RpcClient } from "../transport/rpc.js";
import type { CapabilityGate } from "../capabilities.js";
import type { LlmProviderView } from "./agent.js";

export interface ProviderService {
  list(): Promise<{ providers: LlmProviderView[] }>;
}

export function createProviderService(rpc: RpcClient, gate: CapabilityGate): ProviderService {
  return {
    async list() {
      gate.require("provider.list");
      return rpc.call<{ providers: LlmProviderView[] }>("provider.list", {});
    },
  };
}
