/// <reference types="@cloudflare/workers-types" />

// D1 access for Next route handlers. The Durable Object in worker.ts receives
// the same binding directly through its env instead.

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ensureSchema } from "./schema";

let schemaReady: Promise<void> | null = null;

export async function getDb(): Promise<D1Database> {
  const { env } = getCloudflareContext();
  const db = (env as { DB?: D1Database }).DB;
  if (!db) {
    throw new Error(
      "D1 binding `DB` is not configured. Check wrangler.jsonc d1_databases and restart the dev server.",
    );
  }
  if (!schemaReady) schemaReady = ensureSchema(db);
  await schemaReady;
  return db;
}

export function requestIsSecure(request: Request): boolean {
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}
