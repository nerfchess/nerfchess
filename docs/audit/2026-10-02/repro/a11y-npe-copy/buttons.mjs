import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
const files = execSync("cd . && git ls-files 'src/**/*.tsx' | grep -v '/dev/'", {encoding:"utf8"}).trim().split("\n");
const re = /<(Button|LinkButton|button)\b[^>]*?>([\s\S]*?)<\/\1>/g;
const labels = [];
for (const f of files) {
  const src = readFileSync("./" + f, "utf8");
  let m;
  while ((m = re.exec(src))) {
    let inner = m[2];
    // strip jsx elements and expressions
    let text = inner.replace(/<[^>]*\/>/g, " ").replace(/<[^>]+>/g, " ").replace(/\{[^{}]*\}/g, " ").replace(/\s+/g, " ").trim();
    const aria = /aria-label=["{]`?([^"`}]+)/.exec(m[0].slice(0, m[0].indexOf(">")+1));
    if (!text && aria) text = "[aria] " + aria[1];
    if (!text || text.length > 60) continue;
    if (/[{}()=;]|=>/.test(text)) continue;
    const line = src.slice(0, m.index).split("\n").length;
    labels.push({ f, line, text });
  }
}
const VERBS = new Set("add accept apply approve ask back ban block browse buy call cancel change check choose claim clear close come confirm connect continue copy create decline delete deny dismiss download draft drag edit enable disable end enter explore export find flip follow forfeit get give go hide hold import invite join jump keep leave let load log make mark message mute next offer open pick pin play post preview print publish rate read rebuild reconnect record redo refresh reject reload remove rename replay report request resend reset resign restore resume retry return reveal review revoke save search see select send set share show sign skip sort spectate start stop submit suggest swap switch take try turn unban unblock undo unfollow unlink unmute unpin update upload use view vote watch withdraw bank cast spend activate abort draw rematch unlock zoom crop rotate collapse expand toggle analyse analyze rewind step study solve shuffle claim stay ignore discard allow fix tap learn queue seek challenge send unsend quit exit restart".split(" "));
const counts = {};
const nonverb = [];
for (const l of labels) {
  const w = l.text.replace(/^\[aria\] /, "").split(/[ ,.:!?]/)[0].toLowerCase().replace(/[^a-z']/g, "");
  if (VERBS.has(w)) continue;
  nonverb.push(l);
  counts[l.text] = (counts[l.text] || 0) + 1;
}
console.log("labels scanned:", labels.length, "non-verb-first:", nonverb.length, "distinct:", Object.keys(counts).length);
for (const [t, c] of Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 80)) console.log(c, JSON.stringify(t));
console.log("--- samples");
for (const l of nonverb.slice(0, 40)) console.log(`${l.f}:${l.line}  ${l.text}`);
