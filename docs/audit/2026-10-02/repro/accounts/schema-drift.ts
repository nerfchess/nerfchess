// Audit scratch: does migrations/*.sql (what wrangler applies) produce the same
// D1 schema as the runtime ensureSchema (SCHEMA_STATEMENTS + ADDITIVE_COLUMNS)?
// Also: which runtime additive statements fail for a reason OTHER than
// "duplicate column" (ensureSchema swallows every error and stamps the
// version anyway), and does ensureSchema run cleanly on top of a migrated DB.
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { D1Shim } from "./d1shim";
import { ensureSchema, SCHEMA_STATEMENTS } from "../../../../../src/lib/server/schema";
import * as schemaMod from "../../../../../src/lib/server/schema";

const MIG = "./migrations";
const files = readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();

function shape(db: DatabaseSync) {
  const out: Record<string, string[]> = {};
  const tables = db.prepare(`SELECT name, type FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as { name: string; type: string }[];
  for (const t of tables) {
    if (t.type !== "table") {
      out[`${t.type}:${t.name}`] = [];
      continue;
    }
    const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all() as { name: string; type: string; notnull: number; dflt_value: unknown; pk: number }[];
    out[`table:${t.name}`] = cols.map((c) => `${c.name} ${c.type}${c.notnull ? " NOT NULL" : ""}${c.dflt_value != null ? " DEFAULT " + c.dflt_value : ""}${c.pk ? " PK" : ""}`).sort();
  }
  return out;
}

// Prefix duplicates and gaps.
const nums = files.map((f) => f.slice(0, 4));
const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
console.log(`migrations: ${files.length} files; duplicate numeric prefixes: ${[...new Set(dupes)].join(", ") || "none"}`);
const maxN = Math.max(...nums.map(Number));
const missing: number[] = [];
for (let i = 1; i <= maxN; i++) if (!nums.includes(String(i).padStart(4, "0"))) missing.push(i);
console.log(`missing numbers: ${missing.join(", ") || "none"}`);

// 1. Apply migrations in wrangler order.
const migrated = new DatabaseSync(":memory:");
let migFail = 0;
for (const f of files) {
  const sql = readFileSync(`${MIG}/${f}`, "utf8");
  try {
    migrated.exec(sql);
  } catch (e) {
    migFail++;
    console.log(`MIGRATION FAILED ${f}: ${(e as Error).message}`);
  }
}
console.log(`migrations applied, ${migFail} failed`);

async function main() {
  // 2. Runtime schema on a fresh DB, logging every additive error.
  const fresh = new D1Shim();
  const additive: string[] = (schemaMod as unknown as { ADDITIVE_COLUMNS?: string[] }).ADDITIVE_COLUMNS ?? [];
  console.log(`SCHEMA_STATEMENTS=${SCHEMA_STATEMENTS.length}, ADDITIVE_COLUMNS exported=${additive.length > 0}`);
  // Log every statement error ensureSchema would swallow.
  const origPrepare = fresh.prepare.bind(fresh);
  const swallowed: string[] = [];
  (fresh as any).prepare = (sql: string) => {
    const st = origPrepare(sql);
    const origRun = st.run.bind(st);
    (st as any).run = async () => {
      try { return await origRun(); } catch (e) {
        const m = (e as Error).message;
        if (!/duplicate column/i.test(m)) swallowed.push(`${m} :: ${sql.replace(/\s+/g, " ").slice(0, 110)}`);
        throw e;
      }
    };
    return st;
  };
  await ensureSchema(fresh as unknown as D1Database);
  console.log(`fresh-DB additive errors other than duplicate column: ${swallowed.length}`);
  for (const s of swallowed) console.log("   ", s);
  // Re-run each additive statement individually to classify errors (ensureSchema hides them).
  const src = readFileSync("./src/lib/server/schema.ts", "utf8");
  void src;

  // 3. Compare shapes.
  const a = shape(migrated);
  const b = shape(fresh.db);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let diffs = 0;
  for (const k of [...keys].sort()) {
    if (!(k in a)) {
      diffs++;
      console.log(`ONLY IN RUNTIME schema.ts: ${k}`);
      continue;
    }
    if (!(k in b)) {
      diffs++;
      console.log(`ONLY IN migrations/: ${k}`);
      continue;
    }
    const ca = new Set(a[k]);
    const cb = new Set(b[k]);
    for (const c of ca) if (!cb.has(c)) { diffs++; console.log(`  ${k}: migrations has  [${c}]`); }
    for (const c of cb) if (!ca.has(c)) { diffs++; console.log(`  ${k}: runtime has     [${c}]`); }
  }
  console.log(`schema drift lines: ${diffs}`);

  // 4. ensureSchema on top of the migrated DB (prod order).
  const onTop = new D1Shim();
  for (const f of files) {
    try { onTop.db.exec(readFileSync(`${MIG}/${f}`, "utf8")); } catch {}
  }
  try {
    await ensureSchema(onTop as unknown as D1Database);
    console.log("ensureSchema on migrated DB: OK");
  } catch (e) {
    console.log("ensureSchema on migrated DB FAILED:", (e as Error).message);
  }
  const marker = onTop.db.prepare(`SELECT value FROM schema_meta WHERE key='additive_version'`).get() as { value: string } | undefined;
  console.log("additive_version stamped:", marker?.value);
}
main().catch((e) => {
  console.error(e);
  process.exit(2);
});
