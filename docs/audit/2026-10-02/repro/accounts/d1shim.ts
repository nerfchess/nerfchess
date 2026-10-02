// Minimal D1Database shim over node:sqlite, for read-only audit scratch tests.
// Never touches the repo or any network.
import { DatabaseSync } from "node:sqlite";

type Bindable = string | number | bigint | null | Uint8Array;

function norm(v: unknown): Bindable {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  return v as Bindable;
}

class Stmt {
  constructor(public db: DatabaseSync, public sql: string, public params: Bindable[] = []) {}
  bind(...args: unknown[]) {
    return new Stmt(this.db, this.sql, args.map(norm));
  }
  private exec() {
    const st = this.db.prepare(this.sql);
    const trimmed = this.sql.trim().toUpperCase();
    const isRead = trimmed.startsWith("SELECT") || trimmed.startsWith("WITH") || /\bRETURNING\b/i.test(this.sql);
    if (isRead) {
      const rows = st.all(...this.params) as Record<string, unknown>[];
      return { results: rows.map((r) => ({ ...r })), success: true, meta: { changes: 0 } };
    }
    const r = st.run(...this.params);
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
  async run() {
    return this.exec();
  }
  async all<T = Record<string, unknown>>() {
    return this.exec() as unknown as { results: T[]; success: boolean; meta: { changes: number } };
  }
  async first<T = Record<string, unknown>>(col?: string): Promise<T | null> {
    const r = this.exec().results[0] as Record<string, unknown> | undefined;
    if (!r) return null;
    return (col ? r[col] : r) as T;
  }
  async raw() {
    return this.exec().results.map((r) => Object.values(r));
  }
  _execSync() {
    return this.exec();
  }
}

export class D1Shim {
  db: DatabaseSync;
  /** Optional hook: called before each batch; throw to simulate failure. */
  beforeBatch?: (n: number) => void;
  batchCount = 0;
  constructor(path = ":memory:") {
    this.db = new DatabaseSync(path);
  }
  prepare(sql: string) {
    return new Stmt(this.db, sql);
  }
  async batch(stmts: Stmt[]) {
    this.batchCount++;
    this.beforeBatch?.(this.batchCount);
    this.db.exec("BEGIN");
    try {
      const out = stmts.map((s) => s._execSync());
      this.db.exec("COMMIT");
      return out;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  async exec(sql: string) {
    this.db.exec(sql);
    return { count: 0, duration: 0 };
  }
}
