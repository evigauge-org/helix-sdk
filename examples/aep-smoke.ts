// scripts/aep-smoke.ts
//
// End-to-end AEP smoke test using the in-repo TypeScript SDK. Requires the
// Next.js dev server running (`bun run dev`) and a valid bearer token in
// AEP_BEARER (any session cookie / dev token your auth layer accepts).
//
// Run with:
//   AEP_BASE_URL=http://localhost:3000 AEP_BEARER=<token> bunx tsx scripts/aep-smoke.ts
import { HelixClient, AEPAuthzError, AEPError } from "@helixsdk/core";

async function main() {
  const baseUrl = process.env.AEP_BASE_URL ?? "http://localhost:3000";
  const bearer = process.env.AEP_BEARER ?? "dev";
  const client = new HelixClient({ baseUrl, auth: { bearer } });

  const init = await client.initialize({
    clientInfo: { name: "aep-smoke", version: "0.1.0" },
    requestedVersions: ["aep-2026-04-24"],
    requestedCapabilities: {
      "self.modify_prompt": true,
      "self.spawn_subagent": true,
      "self.learning_memory": true,
      "messaging.peer": true,
      "streaming.sse": true,
    },
  });
  console.log("initialize:", init.session_id, init.capabilities);

  const agent = await client.agent.create({
    name: "Smoke Agent",
    constitution: {
      immutable_directives: "Be concise.",
      mutable_prompt: "You are a smoke-test agent.",
      mutable_prompt_policy: "auto",
    },
    toolset: ["helix.web_search"],
    ceilings: { max_cycles: 5, max_subagents: 2, max_tool_calls_per_cycle: 4, max_wall_seconds: 300 },
    budgets: { tokens_per_cycle: 10000, tool_calls_per_cycle: 4, seconds_per_cycle: 60 },
  });
  console.log("agent.create:", agent.id);

  const run = await client.run.create({ agent_id: agent.id, goal: "Smoke test: reply with 'ok'." });
  console.log("run.create:", run.id);

  let eventCount = 0;
  for await (const ev of client.run.events(run.id)) {
    console.log("event:", ev.type, ev.payload);
    eventCount++;
    if (ev.type === "run.ended" || eventCount > 50) break;
  }
  console.log("total events:", eventCount);
}
main().catch((e) => {
  if (e instanceof AEPAuthzError) {
    console.error(`\nauthz_denied: ${e.message}`);
    console.error(`(Your API key is missing the required scope. Add it via Settings → API Keys, or create a new key with broader scope.)`);
    process.exit(2);
  }
  if (e instanceof AEPError) {
    console.error(`\n${e.symbol}: ${e.message}`);
    process.exit(2);
  }
  console.error(e);
  process.exit(1);
});
