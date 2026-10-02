// Permissive fake D1: every query succeeds and returns nothing. Enough to get
// past `db()` gates (queue, playbot) without a real database. NOT a model of
// the schema; anything that reads rows sees "no row".
/* eslint-disable @typescript-eslint/no-explicit-any */
export function fakeD1(log: string[] = []) {
  const stmt = (sql: string): any => {
    const s: any = {
      sql,
      bind: (..._args: any[]) => s,
      first: async () => {
        log.push(sql.slice(0, 80));
        return null;
      },
      all: async () => {
        log.push(sql.slice(0, 80));
        return { results: [], success: true, meta: {} };
      },
      run: async () => {
        log.push(sql.slice(0, 80));
        return { success: true, meta: { changes: 0, last_row_id: 0 } };
      },
      raw: async () => [],
    };
    return s;
  };
  return {
    prepare: (sql: string) => stmt(sql),
    batch: async (stmts: any[]) => stmts.map(() => ({ results: [], success: true, meta: {} })),
    exec: async (_sql: string) => ({ count: 0, duration: 0 }),
    dump: async () => new ArrayBuffer(0),
  };
}
