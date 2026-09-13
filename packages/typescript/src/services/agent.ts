// packages/typescript/src/services/agent.ts
import type { RpcClient } from "../transport/rpc.js";
import type { CapabilityGate } from "../capabilities.js";

export interface AgentService {
  create(params: AgentCreateParams): Promise<AgentRecord>;
  get(params: AgentGetParams): Promise<AgentRecord>;
  list(params?: AgentListParams): Promise<AgentListResult>;
  update(params: AgentUpdateParams): Promise<AgentRecord>;
  approve_prompt_change(params: AgentApprovePromptChangeParams): Promise<{ applied: boolean }>;
  cancel(params: { agent_id: string }): Promise<AgentRecord>;
  archive(params: { agent_id: string }): Promise<AgentRecord>;
}

export type LlmProviderKind = "openai_compat" | "anthropic" | "gemini";

export interface AgentRunnerConfig {
  provider_id?: string;
  model?: string;
}

export interface LlmProviderView {
  id: string;
  name: string;
  kind: LlmProviderKind;
  base_url: string | null;
  api_key_hint: string;
  default_model: string | null;
  last_tested_at: string | null;
  last_test_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalMcpServerAuth {
  bearer?: string;
  headers?: Record<string, string>;
}

/** External MCP server attachment spec (Plan 5 / Phase 6 — Path B). */
export interface ExternalMcpServerSpec {
  url: string;
  auth?: ExternalMcpServerAuth;
  name?: string;
}

/** External MCP server as exposed on AgentRecord — auth REDACTED on read. */
export interface ExternalMcpServerView {
  url: string;
  name: string;
  enabled: boolean;
}

export interface AgentCreateParams {
  name: string;
  constitution: {
    immutable_directives: string;
    mutable_prompt: string;
    mutable_prompt_policy: "auto" | "approval_required" | "locked";
  };
  toolset: string[];
  external_mcp_servers?: ExternalMcpServerSpec[];
  ceilings: {
    max_cycles: number;
    max_subagents: number;
    max_tool_calls_per_cycle: number;
    max_wall_seconds: number;
  };
  budgets: {
    tokens_per_cycle: number;
    tool_calls_per_cycle: number;
    seconds_per_cycle: number;
  };
  subject_ids?: string[];
  metadata?: Record<string, unknown>;
  runner?: AgentRunnerConfig;
}

export interface AgentGetParams {
  agent_id: string;
  include?: Array<"prompt_history">;
  prompt_history_cursor?: string;
}

export interface AgentListParams {
  root_agent_id?: string;
  parent_agent_id?: string;
  lifecycle_state?: "active" | "sleeping" | "complete" | "cancelled" | "error" | "archived";
  subject_id?: string;
  cursor?: string;
  limit?: number;
}

export interface AgentUpdateParams {
  agent_id: string;
  name?: string;
  metadata?: Record<string, unknown>;
  ceilings?: AgentCreateParams["ceilings"];
  budgets?: AgentCreateParams["budgets"];
  constitution?: AgentCreateParams["constitution"];
  /** Diff-replace: names not in the new list are removed; provided names are upserted. */
  external_mcp_servers?: ExternalMcpServerSpec[];
  runner?: AgentRunnerConfig | null;
}

export interface AgentApprovePromptChangeParams {
  agent_id: string;
  pending_change_id: string;
  approve: boolean;
  comment?: string;
}

export interface AgentRecord {
  id: string;
  name: string;
  constitution: AgentCreateParams["constitution"];
  toolset: string[];
  /** Auth REDACTED on read — only url + name + enabled are returned. */
  external_mcp_servers?: ExternalMcpServerView[];
  ceilings: AgentCreateParams["ceilings"];
  budgets: AgentCreateParams["budgets"];
  parent_agent_id: string | null;
  root_agent_id: string;
  lifecycle_state: "active" | "sleeping" | "complete" | "cancelled" | "error" | "archived";
  next_wake_at: string | null;
  subject_ids: string[];
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  runner: AgentRunnerConfig | null;
  prompt_history?: Array<{ id: string; diff: string; reason: string; approved_by: string | null; applied_at: string }>;
  prompt_history_cursor?: string;
}

export interface AgentListResult {
  items: AgentRecord[];
  cursor: string | null;
}

export function createAgentService(rpc: RpcClient, gate: CapabilityGate): AgentService {
  return {
    async create(params) {
      return rpc.call<AgentRecord>("agent.create", params);
    },
    async get(params) {
      return rpc.call<AgentRecord>("agent.get", params);
    },
    async list(params = {}) {
      return rpc.call<AgentListResult>("agent.list", params);
    },
    async update(params) {
      return rpc.call<AgentRecord>("agent.update", params);
    },
    async approve_prompt_change(params) {
      gate.require("agent.approve_prompt_change");
      return rpc.call<{ applied: boolean }>("agent.approve_prompt_change", params);
    },
    async cancel(params) {
      return rpc.call<AgentRecord>("agent.cancel", params);
    },
    async archive(params) {
      return rpc.call<AgentRecord>("agent.archive", params);
    },
  };
}
