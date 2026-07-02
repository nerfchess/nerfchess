"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import {
  AVATARS,
  loadProfile,
  saveProfile,
  PROFILE_CHANGED_EVENT,
  USERNAME_MAX_LENGTH,
} from "@/lib/profile";

/** Profile section body: username field plus the preset picture picker. */
export function ProfileEditor() {
  const [username, setUsername] = useState("");
  const [avatarId, setAvatarId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const p = loadProfile();
      setUsername(p.username ?? "");
      setAvatarId(p.avatarId);
    };
    sync();
    window.addEventListener(PROFILE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(PROFILE_CHANGED_EVENT, sync);
  }, []);

  const commit = (nextName: string, nextAvatar: string | null) => {
    saveProfile({ username: nextName, avatarId: nextAvatar });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar avatarId={avatarId} name={username || null} size={40} />
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onBlur={() => commit(username, avatarId)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          maxLength={USERNAME_MAX_LENGTH}
          placeholder="Your username"
          aria-label="Username"
          className="min-w-0 flex-1 rounded border border-white/15 bg-ink-900/60 px-2.5 py-1.5 text-sm text-parchment placeholder:text-parchment-400/40 focus:border-gold/60 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {AVATARS.map((a) => (
          <button
            key={a.id}
            type="button"
            title={a.label}
            aria-label={a.label}
            aria-pressed={avatarId === a.id}
            onClick={() => {
              const next = avatarId === a.id ? null : a.id;
              setAvatarId(next);
              commit(username, next);
            }}
            className={
              "grid place-items-center rounded p-0.5 transition " +
              (avatarId === a.id
                ? "bg-gold/15 ring-1 ring-gold/70"
                : "hover:bg-white/[0.05]")
            }
          >
            <Avatar avatarId={a.id} size={28} />
          </button>
        ))}
      </div>
    </div>
  );
}
