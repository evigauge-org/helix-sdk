// scripts/oauth-smoke.ts
//
// End-to-end OAuth 2.1 + PKCE smoke test. Registers nothing — uses a
// pre-existing public OAuth client. Walks the full auth-code flow:
//   1. Generate PKCE verifier/challenge.
//   2. Open the authorize URL in the user's browser (or print it).
//   3. Listen on http://localhost:7777/callback for the redirect with `code`.
//   4. Exchange the code for an access_token at /api/auth/oauth2/token.
//   5. Use the access token as the AEP bearer and run a minimal AEP flow
//      (initialize → agent.create → run.create → SSE until run.ended).
//
// Required env:
//   OAUTH_CLIENT_ID  — public client id from scripts/oauth-register-client.ts
//   AEP_BASE_URL     — default http://localhost:3000
//
// Optional env:
//   OAUTH_SCOPE      — space-separated scope list. Default:
//                      "openid offline_access agent.read agent.write run.create run.read stream.subscribe"

import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { exec } from "node:child_process";
import { HelixClient, AEPAuthzError, AEPError } from "@helixsdk/core";

const BASE = process.env.AEP_BASE_URL ?? "http://localhost:3000";
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const SCOPE = process.env.OAUTH_SCOPE ??
  "offline_access agent.read agent.write run.create run.read stream.subscribe";
const REDIRECT_URI = "http://localhost:7777/callback";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function pkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32)); // ~43 chars, URL-safe
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

function tryOpen(url: string) {
  const cmd =
    process.platform === "win32" ? `start "" "${url}"`
      : process.platform === "darwin" ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, (err) => { if (err) console.log(`(could not auto-open browser; copy the URL above)`); });
}

async function captureCode(state: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost:7777");
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get("code");
      const stateParam = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      if (error) {
        res.writeHead(400, { "Content-Type": "text/plain" })
          .end(`OAuth error: ${error} — ${url.searchParams.get("error_description") ?? ""}`);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }
      if (stateParam !== state) {
        res.writeHead(400, { "Content-Type": "text/plain" }).end("state mismatch");
        server.close();
        reject(new Error("state mismatch"));
        return;
      }
      if (!code) {
        res.writeHead(400, { "Content-Type": "text/plain" }).end("no code in redirect");
        server.close();
        reject(new Error("no code in redirect"));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" }).end(
        `<!doctype html><meta charset="utf-8"><title>Authorized</title>
         <body style="font-family:system-ui;padding:48px;text-align:center">
         <h1 style="font-weight:500">All set ✓</h1>
         <p>You can close this tab and return to your terminal.</p></body>`
      );
      server.close();
      resolve(code);
    });
    server.listen(7777, "127.0.0.1");
  });
}

async function main() {
  if (!CLIENT_ID) throw new Error("OAUTH_CLIENT_ID env var is required");

  const { verifier, challenge } = pkce();
  const state = base64url(randomBytes(16));

  const authUrl = new URL(`${BASE}/api/auth/oauth2/authorize`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  console.log("\nOpen the authorization URL in your browser (you must already be signed in to Helix):\n");
  console.log(authUrl.toString(), "\n");
  tryOpen(authUrl.toString());

  const codePromise = captureCode(state);
  console.log("Waiting for redirect to http://localhost:7777/callback ...");
  const code = await codePromise;
  console.log("✓ got authorization code\n");

  // Exchange code for token. Public client, no client_secret needed.
  const tokenRes = await fetch(`${BASE}/api/auth/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`token endpoint HTTP ${tokenRes.status}: ${text}`);
  }
  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    scope: string;
  };
  console.log("✓ got access token");
  console.log(`  scopes:    ${tokenData.scope}`);
  console.log(`  expires_in: ${tokenData.expires_in}s`);
  console.log(`  refresh_token: ${tokenData.refresh_token ? "(present)" : "(none)"}\n`);

  // Use the access token to call AEP RPC.
  const client = new HelixClient({ baseUrl: BASE, auth: { bearer: tokenData.access_token } });

  const init = await client.initialize({
    clientInfo: { name: "oauth-smoke", version: "0.1.0" },
    requestedVersions: ["aep-2026-04-24"],
    requestedCapabilities: { "streaming.sse": true },
  });
  console.log("initialize:", init.session_id, init.capabilities);

  const agent = await client.agent.create({
    name: "OAuth Smoke Agent",
    constitution: {
      immutable_directives: "Be concise.",
      mutable_prompt: "You are an OAuth smoke-test agent.",
      mutable_prompt_policy: "auto",
    },
    toolset: ["helix.web_search"],
    ceilings: { max_cycles: 5, max_subagents: 2, max_tool_calls_per_cycle: 4, max_wall_seconds: 300 },
    budgets: { tokens_per_cycle: 10000, tool_calls_per_cycle: 4, seconds_per_cycle: 60 },
  });
  console.log("agent.create:", agent.id);

  const run = await client.run.create({ agent_id: agent.id, goal: "OAuth smoke: reply 'ok'." });
  console.log("run.create:", run.id);

  let n = 0;
  for await (const ev of client.run.events(run.id)) {
    console.log("event:", ev.type, ev.payload);
    n++;
    if (ev.type === "run.ended" || n > 50) break;
  }
  console.log(`\n✓ OAuth smoke completed. total events: ${n}`);
}

main().catch((e) => {
  if (e instanceof AEPAuthzError) {
    console.error(`\nauthz_denied: ${e.message}`);
    console.error(`(The OAuth-issued token is missing a required scope. Re-run with broader OAUTH_SCOPE.)`);
    process.exit(2);
  }
  if (e instanceof AEPError) {
    console.error(`\n${e.symbol}: ${e.message}`);
    process.exit(2);
  }
  console.error(e);
  process.exit(1);
});
