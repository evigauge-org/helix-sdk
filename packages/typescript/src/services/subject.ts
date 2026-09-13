// packages/typescript/src/services/subject.ts
import type { RpcClient } from "../transport/rpc.js";
import type { CapabilityGate } from "../capabilities.js";

export interface SubjectService {
  export(params: { subject_id: string }): Promise<SubjectExportResult>;
  erase(params: SubjectEraseParams): Promise<ErasureManifest>;
  read(params: { subject_id: string }): Promise<SubjectExportResult>;
}

export interface SubjectExportResult {
  subject_id: string;
  agents: unknown[];
  runs: unknown[];
  artifacts: unknown[];
  memory_records: unknown[];
  messages: unknown[];
  prompt_history: unknown[];
  generated_at: string;
}

export interface SubjectEraseParams {
  subject_id: string;
  mode: "hard_delete" | "redact";
}

export interface ErasureManifest {
  subject_id: string;
  deleted: Array<{ resource: string; id: string }>;
  redacted: Array<{ resource: string; id: string }>;
  retained: Array<{ resource: string; id: string; reason: string }>;
  generated_at: string;
}

export function createSubjectService(rpc: RpcClient, gate: CapabilityGate): SubjectService {
  return {
    async export(params) {
      gate.require("subject.export");
      return rpc.call<SubjectExportResult>("subject.export", params);
    },
    async erase(params) {
      gate.require("subject.erase");
      return rpc.call<ErasureManifest>("subject.erase", params);
    },
    async read(params) {
      gate.require("subject.read");
      return rpc.call<SubjectExportResult>("subject.read", params);
    },
  };
}
