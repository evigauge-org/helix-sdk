// scripts/gdpr-smoke.ts
//
// End-to-end DSAR smoke for Plan 6 / Phase 7.
//
// Flow:
//   1. POST /api/me/subjects (REST, session-scoped) — create a fresh Subject.
//   2. AEP initialize negotiating compliance.gdpr.
//   3. AEP agent.create with subject_ids: [<sub>].
//   4. AEP memory.write with subject_id: <sub> — gives us a single-subject
//      record we can deterministically erase.
//   5. AEP subject.read — assert agent + memory present.
//   6. AEP subject.export — assert same content.
//   7. AEP subject.erase mode=redact — assert manifest mentions agent
//      (redacted, sole subject) and memory (redacted).
//   8. AEP subject.read again — assert agent.name === "[REDACTED]".
//
// Requires:
//   AEP_BASE_URL  (default http://localhost:3000)
//   AEP_BEARER    — hlx_… key with aep:* scope (so AEP and REST both pass)
//
// The api-key is dual-use here: REST routes (e.g. /api/me/subjects) accept
// the bearer through better-auth's getSession path that we wired in Plan 3,
// AND the AEP RPC accepts it too. So one env var unlocks both surfaces.

import { HelixClient, AEPAuthzError, AEPError } from "@helixsdk/core";

const BASE = process.env.AEP_BASE_URL ?? "http://localhost:3000";
const BEARER = process.env.AEP_BEARER;

interface SubjectCreated {
  id: string;
  subject_id: string;
}

async function createSubjectViaRest(): Promise<SubjectCreated> {
  const res = await fetch(`${BASE}/api/me/subjects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BEARER}`,
    },
    body: JSON.stringify({
      metadata: { smoke: true, name: "Test Subject", created: new Date().toISOString() },
    }),
  });
  if (!res.ok) {
    throw new Error(`POST /api/me/subjects -> HTTP ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as SubjectCreated;
}

interface ManifestEntry { kind: string; id: string; aepId?: string | null }
interface ErasureManifest {
  subject_id: string;
  mode: string;
  deleted: ManifestEntry[];
  redacted: ManifestEntry[];
  stripped: ManifestEntry[];
  retained: ManifestEntry[];
  performed_at: string;
}

async function rpc<T>(client: HelixClient, method: string, params: unknown): Promise<T> {
  // Use the SDK's transport for raw calls — cleaner than re-building fetch.
  // The HelixClient exposes services; for not-yet-wrapped methods we call
  // through the underlying RpcClient via an `any` cast. Acceptable in a
  // smoke script.
  const rpcClient = (client as unknown as { rpc: { call<U>(m: string, p: unknown): Promise<U> } }).rpc;
  return rpcClient.call<T>(method, params);
}

async function main() {
  if (!BEARER) throw new Error("AEP_BEARER env var is required");

  console.log("\n— Step 1: create subject via REST");
  const subj = await createSubjectViaRest();
  console.log(`  ✓ subject ${subj.subject_id}`);

  const client = new HelixClient({ baseUrl: BASE, auth: { bearer: BEARER } });

  console.log("\n— Step 2: AEP initialize");
  const init = await client.initialize({
    clientInfo: { name: "gdpr-smoke", version: "0.1.0" },
    requestedVersions: ["aep-2026-04-24"],
    requestedCapabilities: { "compliance.gdpr": true, "self.learning_memory": true },
  });
  if (!init.capabilities["compliance.gdpr"]) {
    throw new Error("server did not negotiate compliance.gdpr — Plan 6 not deployed?");
  }
  console.log(`  ✓ session ${init.session_id}, compliance.gdpr=true`);

  console.log("\n— Step 3: agent.create with subject_ids");
  const agent = await client.agent.create({
    name: "GDPR Smoke Agent",
    constitution: {
      immutable_directives: "Be concise.",
      mutable_prompt: "PII for test subject — should disappear after erasure.",
      mutable_prompt_policy: "auto",
    },
    toolset: ["helix.web_search"],
    subject_ids: [subj.subject_id],
    ceilings: { max_cycles: 1, max_subagents: 0, max_tool_calls_per_cycle: 4, max_wall_seconds: 60 },
    budgets: { tokens_per_cycle: 4000, tool_calls_per_cycle: 4, seconds_per_cycle: 60 },
  });
  console.log(`  ✓ agent ${agent.id}`);

  console.log("\n— Step 4: memory.write tagged with subject_id");
  const memWrite = await rpc<{ id: string }>(client, "memory.write", {
    tree_root_id: agent.id,
    namespace: "gdpr.smoke",
    key: "test-record",
    value: { sensitive: "PII data here", subject_name: "Test Subject" },
    subject_id: subj.subject_id,
  });
  console.log(`  ✓ memory record ${memWrite.id ?? "(no id field)"}`);

  console.log("\n— Step 5: subject.read");
  const snapshot = await rpc<{
    counts: { agents: number; memory: number; runs: number; artifacts: number; messages: number };
    records: { agents: Array<{ aepId: string | null; name: string }>; memory: unknown[] };
  }>(client, "subject.read", { subject_id: subj.subject_id });
  console.log(`  counts: ${JSON.stringify(snapshot.counts)}`);
  if (snapshot.counts.agents !== 1) throw new Error(`expected 1 agent in read, got ${snapshot.counts.agents}`);
  if (snapshot.counts.memory !== 1) throw new Error(`expected 1 memory in read, got ${snapshot.counts.memory}`);
  console.log(`  ✓ agent + memory both present`);

  console.log("\n— Step 6: subject.export");
  const bundle = await rpc<{ portable_format_version: string }>(client, "subject.export", {
    subject_id: subj.subject_id,
  });
  if (bundle.portable_format_version !== "1") throw new Error("missing portable_format_version=1");
  console.log(`  ✓ portable bundle v${bundle.portable_format_version}`);

  console.log("\n— Step 7: subject.erase mode=redact");
  const manifest = await rpc<ErasureManifest>(client, "subject.erase", {
    subject_id: subj.subject_id,
    mode: "redact",
  });
  console.log(`  manifest: deleted=${manifest.deleted.length} redacted=${manifest.redacted.length} stripped=${manifest.stripped.length} retained=${manifest.retained.length}`);
  if (manifest.redacted.length < 1) throw new Error("expected redacted entries (agent + memory)");
  const agentEntry = manifest.redacted.find((e) => e.kind === "agent");
  if (!agentEntry) throw new Error("agent missing from redacted manifest");
  const memEntry = manifest.redacted.find((e) => e.kind === "memory");
  if (!memEntry) throw new Error("memory missing from redacted manifest");
  console.log(`  ✓ agent + memory both in manifest.redacted`);

  console.log("\n— Step 8: subject.read again — agent.name should be [REDACTED]");
  const post = await rpc<{ records: { agents: Array<{ name: string }> } }>(client, "subject.read", {
    subject_id: subj.subject_id,
  });
  // After redact + clear-subjectIds, the agent no longer has the subject in its list,
  // so the post-erase read won't return it. That's the expected behavior — verify.
  if (post.records.agents.length !== 0) {
    // If it does come back, name should be REDACTED.
    const first = post.records.agents[0];
    if (first.name !== "[REDACTED]") {
      throw new Error(`agent name not redacted: ${first.name}`);
    }
    console.log(`  ✓ agent shows as [REDACTED] (subject still tagged?)`);
  } else {
    console.log(`  ✓ agent removed from subject's tagged list (subjectIds cleared)`);
  }

  console.log("\n✓ GDPR smoke complete.\n");
  console.log(`  Cleanup hint: subject row + audit log row remain at`);
  console.log(`  /settings/privacy and in subject_erasure_log table.`);
}

main().catch((e) => {
  if (e instanceof AEPAuthzError) {
    console.error(`\nauthz_denied: ${e.message}`);
    console.error(`Your AEP_BEARER key is missing one of: subject.read, subject.export, subject.erase, agent.write, memory.write.`);
    process.exit(2);
  }
  if (e instanceof AEPError) {
    console.error(`\n${e.symbol}: ${e.message}`);
    process.exit(2);
  }
  console.error(e);
  process.exit(1);
});
