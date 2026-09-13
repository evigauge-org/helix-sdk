// scripts/mcp-smoke.ts
//
// Smoke test for Plan 5 (external MCP attachment / Phase 6).
//
// What this verifies:
//   1. agent.create accepts external_mcp_servers and persists them.
//   2. The response shape echoes the redacted view (url + name + enabled,
//      no bearer leakage).
//   3. agent.get re-fetches and includes the same redacted shape.
//
// What this does NOT verify (separate concern, requires a reachable MCP
// server + non-deterministic LLM behavior):
//   - Whether the runner actually resolves remote tools at run start.
//   - Whether the agent decides to call an external tool during a run.
//
// To exercise (1)–(3) above, you only need a valid AEP_BEARER and the
// dev server running. No external MCP server needs to be reachable —
// agent.create persists the attachment regardless.
//
// Run:
//   AEP_BASE_URL=http://localhost:3000 \
//   AEP_BEARER='hlx_…' \
//   bun run examples/mcp-smoke.ts
//
// Optional: provide MCP_SERVER_URL to use a real URL (still no connect
// attempt at create-time — connect only happens at run-start in Plan 5).

import { HelixClient, AEPAuthzError, AEPError } from "@helixsdk/core";

async function main() {
  const baseUrl = process.env.AEP_BASE_URL ?? "http://localhost:3000";
  const bearer = process.env.AEP_BEARER;
  if (!bearer) throw new Error("AEP_BEARER env var is required");
  const client = new HelixClient({ baseUrl, auth: { bearer } });

  const init = await client.initialize({
    clientInfo: { name: "mcp-smoke", version: "0.1.0" },
    requestedVersions: ["aep-2026-04-24"],
    requestedCapabilities: { "tools.mcp_external": true },
  });
  console.log("initialize:", init.session_id);
  console.log("  capability tools.mcp_external:", init.capabilities["tools.mcp_external"]);
  if (!init.capabilities["tools.mcp_external"]) {
    console.warn("⚠️  Server didn't negotiate tools.mcp_external; Plan 5 may not be deployed.");
  }

  const mcpUrl = process.env.MCP_SERVER_URL ?? "https://example.invalid/mcp";

  const agent = await client.agent.create({
    name: "MCP Smoke Agent",
    constitution: {
      immutable_directives: "Be concise.",
      mutable_prompt: "You are an MCP smoke-test agent.",
      mutable_prompt_policy: "auto",
    },
    toolset: ["helix.web_search"],
    external_mcp_servers: [
      {
        url: mcpUrl,
        name: "smoke-server",
        auth: { bearer: "test-bearer-not-real" },
      },
    ],
    ceilings: { max_cycles: 1, max_subagents: 0, max_tool_calls_per_cycle: 4, max_wall_seconds: 60 },
    budgets: { tokens_per_cycle: 4000, tool_calls_per_cycle: 4, seconds_per_cycle: 60 },
  });
  console.log("agent.create:", agent.id);

  const echoed = agent.external_mcp_servers ?? [];
  if (echoed.length !== 1) {
    throw new Error(`expected 1 external server in agent.create response, got ${echoed.length}`);
  }
  const e = echoed[0];
  console.log("  external_mcp_servers[0]:", e);
  if ("auth" in (e as unknown as Record<string, unknown>)) {
    throw new Error("FAIL — auth field leaked in agent.create response (should be REDACTED)");
  }
  if (e.url !== mcpUrl || e.name !== "smoke-server" || e.enabled !== true) {
    throw new Error(`FAIL — redacted view shape mismatch: ${JSON.stringify(e)}`);
  }
  console.log("  ✓ no auth leakage in agent.create response");

  // Re-fetch via agent.get and verify the same shape persists.
  const fetched = await client.agent.get({ agent_id: agent.id });
  const fetchedServers = fetched.external_mcp_servers ?? [];
  if (fetchedServers.length !== 1) {
    throw new Error(`expected 1 external server in agent.get response, got ${fetchedServers.length}`);
  }
  if ("auth" in (fetchedServers[0] as unknown as Record<string, unknown>)) {
    throw new Error("FAIL — auth field leaked in agent.get response (should be REDACTED)");
  }
  console.log("  ✓ no auth leakage in agent.get response");

  console.log("\n✓ MCP smoke completed: create + read round-trip the redacted external_mcp_servers shape.");
  console.log("  (Run-time tool merge happens at run.create; that's a separate manual flow per Plan 5 Task 10.)");
}

main().catch((e) => {
  if (e instanceof AEPAuthzError) {
    console.error(`\nauthz_denied: ${e.message}`);
    process.exit(2);
  }
  if (e instanceof AEPError) {
    console.error(`\n${e.symbol}: ${e.message}`);
    process.exit(2);
  }
  console.error(e);
  process.exit(1);
});
