// Mint a GitHub App installation token for the engine self-updater's git
// fetches (org policy: no deploy keys). Zero deps: RS256 JWT via node:crypto,
// exchanged for a one-hour installation token scoped to whatever the App is
// installed on (give it Contents: Read-only on the nerfchess repo only).
//
// Env (from /etc/nerfchess-engine-updater.env):
//   GITHUB_APP_ID              — the App's numeric id
//   GITHUB_APP_INSTALLATION_ID — the installation's numeric id
//   GITHUB_APP_KEY_PATH        — PEM private key (default below, chmod 600)
//
// Prints the token to stdout; everything else goes to stderr.
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";

const appId = process.env.GITHUB_APP_ID;
const instId = process.env.GITHUB_APP_INSTALLATION_ID;
const keyPath =
  process.env.GITHUB_APP_KEY_PATH ?? "/home/ubuntu/.secrets/nerfchess-github-app.pem";

if (!appId || !instId) {
  console.error(
    "GitHub App not configured: set GITHUB_APP_ID and GITHUB_APP_INSTALLATION_ID " +
      "in /etc/nerfchess-engine-updater.env (see engine-service/README.md)",
  );
  process.exit(2);
}

let key;
try {
  key = readFileSync(keyPath, "utf8");
} catch {
  console.error(`GitHub App private key not readable at ${keyPath}`);
  process.exit(2);
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
// iat backdated 60s for clock skew; 9-minute expiry (GitHub max is 10).
const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iat: now - 60, exp: now + 540, iss: appId })}`;
const jwt = `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(key, "base64url")}`;

const res = await fetch(`https://api.github.com/app/installations/${instId}/access_tokens`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${jwt}`,
    accept: "application/vnd.github+json",
    "user-agent": "nerfchess-engine-updater",
    "x-github-api-version": "2022-11-28",
  },
});
if (!res.ok) {
  console.error(`installation token mint failed: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
process.stdout.write((await res.json()).token);
