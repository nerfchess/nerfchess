import { register } from "node:module";
register("./hooks.mjs", import.meta.url);
globalThis.WebSocketRequestResponsePair = class { constructor(a, b) { this.a = a; this.b = b; } };
