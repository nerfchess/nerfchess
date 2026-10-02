// Evaluate next.config.mjs headers() statically (production env) and assert
// the security headers exist on every route and the CSP's shape.
process.env.NODE_ENV = "production";
const cfg = (await import("../../../../../next.config.mjs")).default;
const rules = await cfg.headers();
const all = rules.find((r) => r.source === "/:path*");
const h = Object.fromEntries(all.headers.map((x) => [x.key.toLowerCase(), x.value]));
const want = ["content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "strict-transport-security"];
for (const k of want) console.log(k.padEnd(28), h[k] ? "present" : "MISSING");
const csp = Object.fromEntries(h["content-security-policy"].split(";").map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
console.log(JSON.stringify(csp, null, 1));
const flags = [];
if (csp["script-src"].includes("'unsafe-inline'")) flags.push("script-src allows 'unsafe-inline' (no nonce/hash): CSP does not stop injected inline script");
if (csp["script-src"].includes("'unsafe-eval'")) flags.push("script-src allows 'unsafe-eval' in production");
if ((csp["connect-src"] || []).includes("ws:")) flags.push("connect-src allows ws: (plaintext websocket to ANY host)");
if ((csp["connect-src"] || []).includes("wss:")) flags.push("connect-src allows wss: to ANY host");
if ((csp["img-src"] || []).includes("https:")) flags.push("img-src allows any https: host (custom background, F044)");
if (!csp["report-uri"] && !csp["report-to"]) flags.push("no report-uri/report-to: violations are never observed");
if (!csp["worker-src"]) flags.push("no worker-src (falls back to script-src)");
if (!csp["manifest-src"]) flags.push("no manifest-src (falls back to default-src 'self', fine)");
for (const f of flags) console.log("FLAG:", f);
console.log("COOP:", h["cross-origin-opener-policy"] || "absent", " CORP:", h["cross-origin-resource-policy"] || "absent");
