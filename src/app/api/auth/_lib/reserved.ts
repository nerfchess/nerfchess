// Usernames nobody may register, upgrade a guest into, or rename into.
//
// RESERVED_USERNAMES covers names that would shadow product routes. The names
// in ADMIN_USERNAMES are reserved too (F043, integrator decision Q14): the
// sign-in route promotes whoever holds a listed name to admin, so a listed
// name that was free to claim was a free admin account. The accounts that
// already hold those names keep them; nobody else can take one.

import { getEnvVar } from "@/lib/server/db";
import { RESERVED_USERNAMES } from "@/lib/server/auth";

export function adminUsernames(): string[] {
  return (getEnvVar("ADMIN_USERNAMES") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isReservedUsername(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return RESERVED_USERNAMES.includes(lower) || adminUsernames().includes(lower);
}
