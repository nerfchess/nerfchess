// Custom background URL rule (slice L request 6): only https links pass, since
// an http image is mixed content the page can never load and the CSP allows
// only https: images. The settings hint says the same.
//
//   ./node_modules/.bin/tsx scripts/polish/custom-bg-url-test.ts
import { sanitizeCustomBgUrl } from "../../src/lib/settings";
import { SECTIONS } from "../../src/components/settings/config";

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || detail === undefined ? "" : `  ${JSON.stringify(detail)}`}`);
}

const cases: [unknown, string][] = [
  ["https://example.com/bg.jpg", "https://example.com/bg.jpg"],
  ["  HTTPS://example.com/bg.jpg  ", "HTTPS://example.com/bg.jpg"],
  ["http://example.com/bg.jpg", ""],
  ["HTTP://example.com/bg.jpg", ""],
  ["//example.com/bg.jpg", ""],
  ["javascript:alert(1)", ""],
  ["data:image/png;base64,AAAA", ""],
  ["https://example.com/a b.jpg", ""],
  ['https://example.com/a".jpg', ""],
  ["https://example.com/a).jpg", ""],
  [`https://example.com/${"a".repeat(3000)}`, ""],
  ["", ""],
  [42, ""],
];
for (const [input, want] of cases) {
  const got = sanitizeCustomBgUrl(input);
  check(`sanitizeCustomBgUrl(${JSON.stringify(input).slice(0, 40)}) -> ${JSON.stringify(want)}`, got === want, got);
}

const row = SECTIONS.flatMap((s) => s.rows ?? []).find((r) => r.id === "customBg");
check("customBg hint says https URL", !!row && /https URL/.test(row.hint ?? "") && !/http\(s\)/.test(row.hint ?? ""), row?.hint);

console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
