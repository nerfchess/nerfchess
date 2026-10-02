import { execSync } from "node:child_process";
const out = execSync(`cd . && grep -rhoE '(error|message|reason): ?"[^"]{3,160}"' src/app/api src/lib/server worker.ts`, {encoding:"utf8", maxBuffer: 1<<26});
const msgs = [...new Set(out.trim().split("\n").map(s => s.replace(/^(error|message|reason): ?"/, "").replace(/"$/, "")))];
// "what to do" heuristics: imperative or Try/Sign in/Pick/Use/Join/Wait/Refresh etc
const action = /\b(try|sign in|pick|choose|use|join|wait|refresh|reload|set|provide|send|enter|check|ask|contact|start|open|create|log in|again|first|instead)\b/i;
const codeLike = /^[a-z0-9_:-]+$/;
let withAction=0, codes=0, bare=0; const bareList=[]; const codeList=[];
for (const m of msgs) { if (codeLike.test(m)) { codes++; codeList.push(m); } else if (action.test(m)) withAction++; else { bare++; bareList.push(m);} }
console.log("distinct:", msgs.length, "with action:", withAction, "machine codes:", codes, "what-only:", bare);
console.log("CODES sample:", codeList.slice(0,40).join(" | "));
console.log("WHAT-ONLY sample:"); for (const m of bareList.slice(0,40)) console.log("  ", m);
