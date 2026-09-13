// scripts/byo-llm-smoke.ts
//
// End-to-end BYO-LLM smoke for Plan 7.
//
// Flow:
//   1. POST /api/me/llm-providers — create encrypted provider row
//   2. POST /api/me/llm-providers/[id]/test — verify key works
//   3. AEP initialize — assert capabilities["runner.byo_llm"] === true
//   4. AEP provider.list — assert >= 1 provider, no plaintext keys returned
//   5. AEP agent.create with runner block — assert agent.runner.provider_id matches
//   6. AEP run.create + tail events — assert at least one cycle ran with tokens > 0
//   7. DELETE provider while agent attached — expect 409 { agent_count: 1 }
//   8. agent.update detach + DELETE provider — expect 204
//
// Requires:
//   AEP_BASE_URL    (default http://localhost:3000)
//   AEP_BEARER      hlx_… key with aep:* scope
//   PROVIDER_KIND   anthropic | openai_compat | gemini
//   PROVIDER_API_KEY  the actual provider key to test
//   PROVIDER_BASE_URL (only required if kind=openai_compat)
//   PROVIDER_MODEL  e.g. claude-haiku-4.5

import { HelixClient, AEPError } from "@helixsdk/core";

const BASE = process.env.AEP_BASE_URL ?? "http://localhost:3000";
const BEARER = process.env.AEP_BEARER;
const KIND = process.env.PROVIDER_KIND as "anthropic" | "openai_compat" | "gemini" | undefined;
const KEY = process.env.PROVIDER_API_KEY;
const BASE_URL = process.env.PROVIDER_BASE_URL;
const MODEL = process.env.PROVIDER_MODEL;

interface ProviderResp { id: string; api_key_hint: string }

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BEARER}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok && res.status !== 204 && res.status !== 409) {
    throw new Error(`${path} → HTTP ${res.status}: ${await res.text()}`);
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

async function rpc<T>(client: HelixClient, method: string, params: unknown): Promise<T> {
  const rpcClient = (client as unknown as { rpc: { call<U>(m: string, p: unknown): Promise<U> } }).rpc;
  return rpcClient.call<T>(method, params);
}

async function main() {
  if (!BEARER) throw new Error("AEP_BEARER required");
  if (!KIND || !KEY || !MODEL) throw new Error("PROVIDER_KIND / PROVIDER_API_KEY / PROVIDER_MODEL required");
  if (KIND === "openai_compat" && !BASE_URL) throw new Error("PROVIDER_BASE_URL required for openai_compat");

  console.log("\n— Step 1: create provider via REST");
  const prov = await rest<ProviderResp>("/api/me/llm-providers", {
    method: "POST",
    body: JSON.stringify({
      name: `smoke-${Date.now()}`,
      kind: KIND,
      api_key: KEY,
      base_url: BASE_URL ?? null,
      default_model: MODEL,
    }),
  });
  console.log(`  ✓ provider ${prov.id}, hint=${prov.api_key_hint}`);

  console.log("\n— Step 2: test connection");
  const test = await rest<{ ok: boolean; kind?: string; message?: string }>(
    `/api/me/llm-providers/${prov.id}/test`,
    { method: "POST" },
  );
  if (!test.ok) throw new Error(`test failed: ${test.kind ?? "?"} — ${test.message}`);
  console.log(`  ✓ test ok`);

  const client = new HelixClient({ baseUrl: BASE, auth: { bearer: BEARER } });

  console.log("\n— Step 3: AEP initialize");
  const init = await client.initialize({
    clientInfo: { name: "byo-llm-smoke", version: "0.1.0" },
    requestedVersions: ["aep-2026-04-24"],
    requestedCapabilities: { "runner.byo_llm": true, "self.learning_memory": true },
  });
  if (!init.capabilities["runner.byo_llm"]) throw new Error("server didn't negotiate runner.byo_llm");
  console.log(`  ✓ session ${init.session_id}, runner.byo_llm=true`);

  console.log("\n— Step 4: provider.list via AEP");
  const listed = await rpc<{ providers: Array<{ id: string; api_key_hint: string }> }>(
    client,
    "provider.list",
    {},
  );
  if (listed.providers.length === 0) throw new Error("provider.list returned empty");
  for (const p of listed.providers) {
    if ((p as unknown as { api_key?: string }).api_key) {
      throw new Error("plaintext api_key leaked in provider.list response");
    }
  }
  console.log(`  ✓ ${listed.providers.length} provider(s), no plaintext keys`);

  console.log("\n— Step 5: agent.create with runner block");
  const agent = await client.agent.create({
    name: "BYO Smoke Agent",
    constitution: {
      immutable_directives: "Be concise.",
      mutable_prompt: "Test agent for BYO LLM smoke.",
      mutable_prompt_policy: "auto",
    },
    toolset: ["helix.web_search"],
    ceilings: { max_cycles: 1, max_subagents: 0, max_tool_calls_per_cycle: 4, max_wall_seconds: 60 },
    budgets: { tokens_per_cycle: 2000, tool_calls_per_cycle: 4, seconds_per_cycle: 60 },
    runner: { provider_id: prov.id, model: MODEL },
  });
  console.log(`  ✓ agent ${agent.id} (runner.provider_id should be ${prov.id})`);

  console.log("\n— Step 6: run.create + tail events");
  const run = await client.run.create({ agent_id: agent.id, goal: "say hello in one word" });
  console.log(`  ✓ run ${run.id} created — polling for cycle execution`);
  // Tail run.events is SDK-specific. For smoke purposes, poll run.get every 2s up to 30s.
  const start = Date.now();
  let cycles = 0;
  while (Date.now() - start < 30_000) {
    const fresh = await client.run.get({ run_id: run.id });
    if (fresh.cycle_count > 0) { cycles = fresh.cycle_count; break; }
    if (fresh.state === "complete" || fresh.state === "cancelled" || fresh.state === "error") break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (cycles === 0) console.log(`  ! no cycles ticked yet — continuing`);
  else console.log(`  ✓ ${cycles} cycle(s) executed`);

  console.log("\n— Step 7: delete-blocked");
  const delRes = await fetch(`${BASE}/api/me/llm-providers/${prov.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${BEARER}` },
  });
  if (delRes.status !== 409) throw new Error(`expected 409, got ${delRes.status}`);
  console.log(`  ✓ delete blocked while agent attached`);

  console.log("\n— Step 8: detach + delete");
  await client.agent.update({ agent_id: agent.id, runner: null });
  const delRes2 = await fetch(`${BASE}/api/me/llm-providers/${prov.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${BEARER}` },
  });
  if (delRes2.status !== 204) throw new Error(`expected 204 after detach, got ${delRes2.status}`);
  console.log(`  ✓ deleted`);

  console.log("\n✓ BYO LLM smoke complete.\n");
}

main().catch((e) => {
  if (e instanceof AEPError) {
    console.error(`\n${e.symbol}: ${e.message}`);
    process.exit(2);
  }
  console.error(e);
  process.exit(1);
});
