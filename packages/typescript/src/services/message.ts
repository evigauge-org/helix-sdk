// packages/typescript/src/services/message.ts
import type { RpcClient } from "../transport/rpc.js";
import type { CapabilityGate } from "../capabilities.js";

export interface MessageService {
  send(params: MessageSendParams): Promise<MessageRecord>;
  inbox(params: MessageInboxParams): Promise<MessageInboxResult>;
  list(params?: MessageListParams): Promise<MessageListResult>;
}

export interface MessageRecord {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  tree_root_id: string;
  body: unknown;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
}

export interface MessageSendParams {
  to_agent_id: string;
  body: unknown;
}

export interface MessageInboxParams {
  agent_id: string;
}

export interface MessageInboxResult {
  messages: MessageRecord[];
}

export interface MessageListParams {
  agent_id?: string;
  tree_root_id?: string;
  cursor?: string;
  limit?: number;
}

export interface MessageListResult {
  items: MessageRecord[];
  cursor: string | null;
}

export function createMessageService(rpc: RpcClient, gate: CapabilityGate): MessageService {
  return {
    async send(params) {
      gate.require("message.send");
      return rpc.call<MessageRecord>("message.send", params);
    },
    async inbox(params) {
      gate.require("message.inbox");
      return rpc.call<MessageInboxResult>("message.inbox", params);
    },
    async list(params = {}) {
      gate.require("message.list");
      return rpc.call<MessageListResult>("message.list", params);
    },
  };
}
