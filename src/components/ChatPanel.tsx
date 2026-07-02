"use client";

import { useEffect, useRef, useState } from "react";
import { Color } from "@/engine/types";
import { MPChatMessage } from "@/lib/multiplayer";
import { loadSettings, saveSettings, SETTINGS_CHANGED_EVENT } from "@/lib/settings";

// In-game chat between the two players. The server relays and stores the
// last 50 messages, so a reload keeps the transcript. A mute toggle (persisted
// in settings) hides messages for players who don't want to see chat.
export function ChatPanel({
  messages,
  myColor,
  onSend,
  className = "",
}: {
  messages: MPChatMessage[];
  myColor: Color;
  onSend: (text: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState("");
  const [muted, setMutedState] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMutedState(loadSettings().muteChat);
    const sync = () => setMutedState(loadSettings().muteChat);
    window.addEventListener(SETTINGS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, muted]);

  const toggleMute = () => {
    const settings = loadSettings();
    saveSettings({ ...settings, muteChat: !settings.muteChat });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className={"plate flex min-h-0 flex-col p-2 " + className}>
      <div className="flex shrink-0 items-center justify-between px-1 pb-1">
        <span className="smallcaps text-[9px] text-parchment-400">Chat</span>
        <button
          type="button"
          onClick={toggleMute}
          className="smallcaps text-[9px] text-parchment-400 hover:text-parchment-100 transition-colors"
          title={muted ? "Show chat messages" : "Hide chat messages"}
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>
      {muted ? (
        <div className="min-h-0 flex-1 px-1 text-[12px] text-parchment-400/60">
          Chat is muted.
        </div>
      ) : (
        <>
          <div ref={listRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1 text-[12px] leading-snug">
            {messages.length === 0 && (
              <div className="text-parchment-400/60">Say hello. Your opponent can read this.</div>
            )}
            {messages.map((m, i) => (
              <div key={`${m.at}-${i}`} className="break-words">
                <span
                  className={
                    "font-display font-semibold " +
                    (m.color === myColor ? "text-gold-leaf" : "text-bruise-glow")
                  }
                >
                  {m.name}
                </span>
                <span className="text-parchment-200"> {m.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={submit} className="mt-2 flex shrink-0 gap-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={200}
              placeholder="Message…"
              aria-label="Chat message"
              className="min-w-0 flex-1 rounded-sm border border-white/15 bg-ink-900/60 px-2 py-1.5 text-[12px] text-parchment placeholder:text-parchment-400/40 focus:border-gold/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="btn-ghost shrink-0 rounded-sm px-2.5 py-1.5 font-display text-[11px] disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
