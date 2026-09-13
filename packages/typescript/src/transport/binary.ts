// packages/typescript/src/transport/binary.ts
import { AEPTransportError } from "../errors.js";
import { ARTIFACT_BYTES_PATH, HEADER_PROTOCOL_VERSION, HEADER_SESSION_ID, PROTOCOL_VERSION } from "../constants.js";

export interface BinaryResult {
  mimeType: string;
  size: number;
  body: ReadableStream<Uint8Array>;
}

export class BinaryClient {
  private readonly baseUrl: string;
  private readonly bearer: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: { baseUrl: string; bearer: string; fetch?: typeof fetch }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.bearer = config.bearer;
    this.fetchImpl = config.fetch ?? fetch;
  }

  async fetchArtifactBytes(
    artifactId: string,
    sessionId: string | null,
    signal?: AbortSignal,
  ): Promise<BinaryResult> {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.bearer}`,
      [HEADER_PROTOCOL_VERSION]: PROTOCOL_VERSION,
    };
    if (sessionId) headers[HEADER_SESSION_ID] = sessionId;

    const resp = await this.fetchImpl(`${this.baseUrl}${ARTIFACT_BYTES_PATH(artifactId)}`, {
      method: "GET",
      headers,
      ...(signal ? { signal } : {}),
    });

    if (!resp.ok) {
      throw new AEPTransportError(`Binary HTTP ${resp.status} ${resp.statusText}`);
    }
    if (!resp.body) {
      throw new AEPTransportError("Binary response has no body");
    }

    return {
      mimeType: resp.headers.get("Content-Type") ?? "application/octet-stream",
      size: Number(resp.headers.get("Content-Length") ?? 0),
      body: resp.body,
    };
  }
}
