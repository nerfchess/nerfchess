"use client";

// Email preference toggle for /settings (brief 17.3, CASL). Reads and writes
// /api/email/prefs. The row renders at its final size from the first paint
// (label, a one-line hint and a disabled toggle) and only its hint text and
// toggle state change once the preference arrives, so it never shifts the
// rows around it.

import { useEffect, useState } from "react";
import { SettingRow } from "@/components/settings/SettingRow";
import { Toggle } from "@/components/settings/controls";

type Prefs = { signedIn: boolean; guest?: boolean; email: string | null; hasEmail: boolean; subscribed: boolean };

export function EmailPrefsRow() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/email/prefs", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Prefs>) : Promise.reject(new Error(String(r.status)))))
      .then((p) => alive && setPrefs(p))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const save = async (next: boolean) => {
    if (!prefs) return;
    const prev = prefs;
    setPrefs({ ...prefs, subscribed: next });
    setSaving(true);
    try {
      const r = await fetch("/api/email/prefs", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed: next }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setPrefs((await r.json()) as Prefs);
      setFailed(false);
    } catch {
      setPrefs(prev);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  let hint: string;
  if (failed) hint = "Could not reach the server. Try again in a moment.";
  else if (!prefs) hint = "Checking your email settings.";
  else if (!prefs.signedIn || prefs.guest) hint = "Sign in with an email address to get account emails.";
  else if (!prefs.hasEmail) hint = "There is no email address on this account.";
  else hint = `Account emails, like the welcome email, go to ${prefs.email}.`;

  const usable = !!prefs && prefs.signedIn && !prefs.guest && prefs.hasEmail;

  return (
    <SettingRow
      label="Emails from Nerf Chess"
      hint={hint}
      control={
        <Toggle
          label="Emails from Nerf Chess"
          checked={usable ? prefs.subscribed : false}
          disabled={!usable || saving}
          onChange={(next) => void save(next)}
        />
      }
    />
  );
}
