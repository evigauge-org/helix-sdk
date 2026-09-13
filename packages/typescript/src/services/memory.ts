// packages/typescript/src/services/memory.ts
import type { RpcClient } from "../transport/rpc.js";
import type { CapabilityGate } from "../capabilities.js";

export interface MemoryService {
  read(params: MemoryReadParams): Promise<MemoryReadResult>;
  write(params: MemoryWriteParams): Promise<MemoryRecord>;
  search(params: MemorySearchParams): Promise<MemorySearchResult>;
  delete(params: MemoryDeleteParams): Promise<{ deleted: number }>;
}

export interface MemoryRecord {
  id: string;
  tree_root_id: string;
  namespace: string;
  key: string;
  value: unknown;
  embedding: number[] | null;
  created_by_agent_id: string;
  created_at: string;
  subject_id: string | null;
  ttl_seconds: number | null;
}

export interface MemoryReadParams {
  tree_root_id: string;
  namespace: string;
  key?: string;
  limit?: number;
  cursor?: string;
}

export interface MemoryReadResult {
  items: MemoryRecord[];
  cursor: string | null;
}

export interface MemoryWriteParams {
  tree_root_id: string;
  namespace: string;
  key: string;
  value: unknown;
  subject_id?: string;
  ttl_seconds?: number;
}

export interface MemorySearchParams {
  tree_root_id: string;
  namespace: string;
  query: string;
  k?: number;
}

export interface MemorySearchResult {
  items: Array<MemoryRecord & { score: number }>;
}

export interface MemoryDeleteParams {
  id?: string;
  tree_root_id?: string;
  namespace?: string;
  subject_id?: string;
}

export function createMemoryService(rpc: RpcClient, gate: CapabilityGate): MemoryService {
  return {
    async read(params) {
      gate.require("memory.read");
      return rpc.call<MemoryReadResult>("memory.read", params);
    },
    async write(params) {
      gate.require("memory.write");
      return rpc.call<MemoryRecord>("memory.write", params);
    },
    async search(params) {
      gate.require("memory.search");
      return rpc.call<MemorySearchResult>("memory.search", params);
    },
    async delete(params) {
      gate.require("memory.delete");
      return rpc.call<{ deleted: number }>("memory.delete", params);
    },
  };
}
