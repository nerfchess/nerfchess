"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, SETTINGS_CHANGED_EVENT, loadSettings, type Settings } from "@/lib/settings";

/** The live settings object for leaf components (clock, player bar) that
 *  need one or two preferences without being handed them as props. Starts
 *  from the defaults so server and first client render agree, then syncs on
 *  mount and on every settings write. */
export function useSettingsValue(): Settings {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    const sync = () => setS(loadSettings());
    sync();
    window.addEventListener(SETTINGS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, sync);
  }, []);
  return s;
}
