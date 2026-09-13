// packages/typescript/src/services/run.ts
import type { RpcClient } from "../transport/rpc.js";
import type { SseClient, SseEvent } from "../transport/sse.js";
import type { CapabilityGate } from "../capabilities.js";

export interface RunService {
  create(params: RunCreateParams): Promise<RunRecord>;
  get(params: { run_id: string }): Promise<RunRecord>;
  list(params: RunListParams): Promise<RunListResult>;
  cancel(params: { run_id: string }): Promise<RunRecord>;
  continue(params: { run_id: string }): Promise<RunRecord>;
  events(run_id: string, opts?: RunEventsOptions): AsyncIterable<SseEvent>;
}

export interface RunCreateParams {
  agent_id: string;
  goal: string;
  inputs?: Record<string, unknown>;
  subject_ids?: string[];
}

export interface RunListParams {
  agent_id: string;
  cursor?: string;
  limit?: number;
}

export interface RunRecord {
  id: string;
  agent_id: string;
  goal: string;
  state: "running" | "sleeping" | "complete" | "cancelled" | "error";
  result: unknown;
  started_at: string;
  ended_at: string | null;
  cycle_count: number;
  subject_ids: string[];
  metadata: Record<string, unknown>;
}

export interface RunListResult {
  items: RunRecord[];
  cursor: string | null;
}

export interface RunEventsOptions {
  since?: string;
  signal?: AbortSignal;
}

export function createRunService(
  rpc: RpcClient,
  sse: SseClient,
  gate: CapabilityGate,
  getSessionId: () => string | null,
): RunService {
  return {
    async create(params) {
      return rpc.call<RunRecord>("run.create", params);
    },
    async get(params) {
      return rpc.call<RunRecord>("run.get", params);
    },
    async list(params) {
      return rpc.call<RunListResult>("run.list", params);
    },
    async cancel(params) {
      return rpc.call<RunRecord>("run.cancel", params);
    },
    async continue(params) {
      return rpc.call<RunRecord>("run.continue", params);
    },
    events(run_id, opts = {}) {
      gate.require("run.events");
      return sse.stream(run_id, getSessionId(), opts);
    },
  };
}
