// packages/typescript/src/transport/rpc.ts
import { AEPError, AEPTransportError, fromJsonRpcError } from "../errors.js";
import { HEADER_PROTOCOL_VERSION, HEADER_SESSION_ID, PROTOCOL_VERSION, RPC_PATH } from "../constants.js";

export interface AuthBearer {
  bearer: string;
}

export interface TransportConfig {
  baseUrl: string;
  auth: AuthBearer;
  fetch?: typeof fetch;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export class RpcClient {
  private nextId = 1;
  private sessionId: string | null = null;
  private readonly baseUrl: string;
  private readonly bearer: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: TransportConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.bearer = config.auth.bearer;
    this.fetchImpl = config.fetch ?? fetch;
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async call<T>(method: string, params?: unknown): Promise<T> {
    const id = this.nextId++;
    const body: JsonRpcRequest = { jsonrpc: "2.0", id, method };
    if (params !== undefined) body.params = params;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${this.bearer}`,
      [HEADER_PROTOCOL_VERSION]: PROTOCOL_VERSION,
    };
    if (this.sessionId) headers[HEADER_SESSION_ID] = this.sessionId;

    let resp: Response;
    try {
      resp = await this.fetchImpl(`${this.baseUrl}${RPC_PATH}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new AEPTransportError("Network error during RPC call", e);
    }

    if (!resp.ok && resp.status >= 500) {
      throw new AEPTransportError(`HTTP ${resp.status} ${resp.statusText}`);
    }

    let payload: JsonRpcResponse<T>;
    try {
      payload = (await resp.json()) as JsonRpcResponse<T>;
    } catch (e) {
      throw new AEPTransportError("Failed to parse JSON-RPC response", e);
    }

    if (payload.error) {
      throw fromJsonRpcError(payload.error);
    }
    if (payload.result === undefined) {
      throw new AEPTransportError("JSON-RPC response missing result and error");
    }
    return payload.result;
  }
}
