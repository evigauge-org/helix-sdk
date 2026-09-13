// packages/typescript/src/services/artifact.ts
import type { RpcClient } from "../transport/rpc.js";
import type { BinaryClient, BinaryResult } from "../transport/binary.js";

export interface ArtifactService {
  get(params: { artifact_id: string }): Promise<ArtifactRecord>;
  list(params?: ArtifactListParams): Promise<ArtifactListResult>;
  delete(params: { artifact_id: string }): Promise<{ deleted: true }>;
  bytes(artifact_id: string, signal?: AbortSignal): Promise<BinaryResult>;
}

export interface ArtifactListParams {
  run_id?: string;
  agent_id?: string;
  subject_id?: string;
  cursor?: string;
  limit?: number;
}

export interface ArtifactRecord {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  created_at: string;
  created_by: { agent_id: string; run_id: string };
  run_id: string;
  subject_id: string | null;
  metadata: Record<string, unknown>;
}

export interface ArtifactListResult {
  items: ArtifactRecord[];
  cursor: string | null;
}

export function createArtifactService(
  rpc: RpcClient,
  bin: BinaryClient,
  getSessionId: () => string | null,
): ArtifactService {
  return {
    async get(params) {
      return rpc.call<ArtifactRecord>("artifact.get", params);
    },
    async list(params = {}) {
      return rpc.call<ArtifactListResult>("artifact.list", params);
    },
    async delete(params) {
      return rpc.call<{ deleted: true }>("artifact.delete", params);
    },
    async bytes(artifact_id, signal) {
      return bin.fetchArtifactBytes(artifact_id, getSessionId(), signal);
    },
  };
}
