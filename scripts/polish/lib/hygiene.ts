// ---------------------------------------------------------------------------
// Console and network hygiene collector (brief section 3.6).
//
//   const h = attachHygiene(page);
//   await page.goto(url); ...
//   const report = h.report();
//
// Collects console errors and warnings (React dev warnings arrive as
// console.error "Warning: ..." in React 18, hydration mismatches included),
// uncaught page errors, failed requests and every 4xx/5xx response. Each item
// carries a normalized `sig` (ids, numbers and hashes stripped) so a baseline
// can compare runs without churning on uuids.
// ---------------------------------------------------------------------------

import type { Page } from "@playwright/test";
import { BASE } from "./common";

/** Same-origin URLs lose their origin; third-party ones keep it. */
const local = (u: string) => (u.startsWith(BASE) ? u.slice(BASE.length) || "/" : u);

export type HygieneItem = {
  kind: "console-error" | "react-warning" | "console-warning" | "pageerror" | "http" | "requestfailed";
  text: string;
  sig: string;
  url?: string;
  status?: number;
};

export type HygieneReport = {
  counts: Record<HygieneItem["kind"], number>;
  items: HygieneItem[];
  requests: number;
  apiCalls: { method: string; url: string; status: number | null }[];
};

export function signature(s: string): string {
  return s
    .replace(/https?:\/\/[^/\s]+/g, "")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\b[0-9a-f]{16,}\b/gi, "<hex>")
    .replace(/\?[^\s"')]*/g, "?<q>")
    .replace(/\d+/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

const REACT_WARNING = /^Warning: |hydrat|did not match|Each child in a list should have a unique "key"|not wrapped in act\(/i;

/** Dev-only noise that is about the dev server itself, not the site. */
const DEV_NOISE = [
  /\[HMR\]/,
  /\[Fast Refresh\]/,
  /Download the React DevTools/,
  /webpack-hmr|turbopack-hmr|__nextjs_original-stack-frame/,
];

export function attachHygiene(page: Page) {
  const items: HygieneItem[] = [];
  const apiCalls: HygieneReport["apiCalls"] = [];
  let requests = 0;

  page.on("console", (msg) => {
    const type = msg.type();
    if (type !== "error" && type !== "warning") return;
    const text = msg.text();
    if (DEV_NOISE.some((r) => r.test(text))) return;
    const loc = msg.location();
    const kind: HygieneItem["kind"] = REACT_WARNING.test(text)
      ? "react-warning"
      : type === "error"
        ? "console-error"
        : "console-warning";
    items.push({ kind, text: text.slice(0, 600), sig: signature(text), url: loc?.url ? local(loc.url) : undefined });
  });
  page.on("pageerror", (err) => {
    const text = `${err.name}: ${err.message}`;
    items.push({ kind: "pageerror", text: text.slice(0, 600), sig: signature(text) });
  });
  page.on("request", () => {
    requests++;
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (DEV_NOISE.some((r) => r.test(url))) return;
    const failure = req.failure()?.errorText ?? "failed";
    // Navigation away and RSC prefetch cancellation abort requests routinely;
    // they are not failures a visitor sees.
    if (failure === "net::ERR_ABORTED") return;
    const path = local(url);
    items.push({ kind: "requestfailed", text: `${req.method()} ${path} ${failure}`, sig: signature(`${req.method()} ${path} ${failure}`), url: path });
  });
  page.on("response", (res) => {
    const url = res.url();
    const path = local(url);
    const status = res.status();
    if (/\/api\//.test(path)) apiCalls.push({ method: res.request().method(), url: path, status });
    if (status >= 400) {
      items.push({
        kind: "http",
        text: `${res.request().method()} ${path} -> ${status}`,
        sig: signature(`${res.request().method()} ${path} -> ${status}`),
        url: path,
        status,
      });
    }
  });

  return {
    report(): HygieneReport {
      const counts = {
        "console-error": 0,
        "react-warning": 0,
        "console-warning": 0,
        pageerror: 0,
        http: 0,
        requestfailed: 0,
      } as HygieneReport["counts"];
      for (const i of items) counts[i.kind]++;
      return { counts, items: [...items], requests, apiCalls: [...apiCalls] };
    },
  };
}
