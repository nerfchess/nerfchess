const Module = require("module");
const path = require("path");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === "cloudflare:workers") return path.join("docs/audit/2026-10-02/repro/hidden-draft", "stubs/cloudflare-workers.cjs");
  if (request.endsWith(".open-next/worker.js")) return path.join("docs/audit/2026-10-02/repro/hidden-draft", "stubs/open-next-worker.cjs");
  return orig.call(this, request, parent, ...rest);
};
globalThis.WebSocketRequestResponsePair = class { constructor(a, b) { this.a = a; this.b = b; } };
