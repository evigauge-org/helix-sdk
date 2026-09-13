// packages/typescript/src/transport/sse.ts
import { AEPTransportError } from "../errors.js";
import { HEADER_PROTOCOL_VERSION, HEADER_SESSION_ID, PROTOCOL_VERSION, RUN_EVENTS_PATH } from "../constants.js";

export interface SseEvent {
  event_id: string;
  run_id: string;
  type: string;
  emitted_at: string;
  payload: unknown;
}

export interface SseOptions {
  since?: string;
  signal?: AbortSignal;
}

export class SseClient {
  private readonly baseUrl: string;
  private readonly bearer: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: { baseUrl: string; bearer: string; fetch?: typeof fetch }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.bearer = config.bearer;
    this.fetchImpl = config.fetch ?? fetch;
  }

  async *stream(runId: string, sessionId: string | null, opts: SseOptions = {}): AsyncIterable<SseEvent> {
    const url = new URL(`${this.baseUrl}${RUN_EVENTS_PATH(runId)}`);
    if (opts.since) url.searchParams.set("since", opts.since);

    const headers: Record<string, string> = {
      "Accept": "text/event-stream",
      "Authorization": `Bearer ${this.bearer}`,
      [HEADER_PROTOCOL_VERSION]: PROTOCOL_VERSION,
    };
    if (sessionId) headers[HEADER_SESSION_ID] = sessionId;

    const resp = await this.fetchImpl(url.toString(), {
      method: "GET",
      headers,
      ...(opts.signal ? { signal: opts.signal } : {}),
    });

    if (!resp.ok) {
      throw new AEPTransportError(`SSE HTTP ${resp.status} ${resp.statusText}`);
    }
    if (!resp.body) {
      throw new AEPTransportError("SSE response has no body");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buf = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const parsed = parseFrame(frame);
          if (parsed) yield parsed;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

function parseFrame(raw: string): SseEvent | null {
  let eventType = "message";
  let dataLine = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) eventType = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
  }
  if (!dataLine) return null;
  try {
    const parsed = JSON.parse(dataLine);
    return {
      event_id: String(parsed.event_id ?? ""),
      run_id: String(parsed.run_id ?? ""),
      type: String(parsed.type ?? eventType),
      emitted_at: String(parsed.emitted_at ?? ""),
      payload: parsed.payload ?? parsed,
    };
  } catch {
    return null;
  }
}
