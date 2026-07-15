"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { AVATAR_PICKER_IDS, avatarIdFor, CUSTOM_AVATAR_MAX_CHARS, isCustomAvatar } from "@/lib/avatars";
import { FLAIR_EMOJI, LAUREL_FLAIR } from "@/lib/flair";

// The formats a browser canvas can reliably decode + re-encode. Anything else
// (HEIC, TIFF, PDF, a mislabeled file) is rejected up front with a clear
// message rather than failing silently mid-process.
const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
// Cap on the raw file the picker will read. We downscale to 96px regardless,
// so this only guards against loading an enormous original into memory.
const MAX_AVATAR_UPLOAD_BYTES = 8 * 1024 * 1024;

// Center-crop to a square and downscale to 96px, returning a compact JPEG
// data URL small enough to store inline in the avatar column. Throws Errors
// whose messages are shown verbatim to the user, so each one explains WHY the
// picture was rejected (wrong type, too large, undecodable, too detailed).
async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (file.type && !ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    throw new Error("That file is not a supported image. Use a PNG, JPG, WebP, or GIF.");
  }
  if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`That image is too large (${mb} MB). Keep it under 8 MB.`);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That image could not be read. It may be corrupt or an unsupported format."));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error("That image could not be read. It may be corrupt or an unsupported format.");
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process the image. Try a different one.");
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      96,
      96,
    );
    for (const quality of [0.82, 0.6, 0.4]) {
      const data = canvas.toDataURL("image/jpeg", quality);
      if (data.length <= CUSTOM_AVATAR_MAX_CHARS) return data;
    }
    throw new Error("That image has too much fine detail to shrink under the size limit. Try a simpler or more tightly cropped picture.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Privacy toggles are persisted one at a time, so each carries its own
// transient feedback: a save in flight, a brief "Saved" flash, or an error.
type SaveState = "idle" | "saving" | "saved" | "error";

export default function EditProfilePage() {
  const [account, setAccount] = useState<AccountUser | null | undefined>(undefined);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [savingFlair, setSavingFlair] = useState(false);
  const [flairError, setFlairError] = useState<string | null>(null);

  // Bio editor state (mirrors the read-only BioSection on /u): a 300-char draft
  // posted to /api/auth/bio, with saved / error feedback.
  const [bioDraft, setBioDraft] = useState("");
  const [bioState, setBioState] = useState<SaveState>("idle");
  const [bioError, setBioError] = useState<string | null>(null);

  // Privacy: friends-list visibility and online/last-seen presence. Loaded from
  // GET /api/users/settings, each saved independently via POST.
  const [friendsPublic, setFriendsPublic] = useState<boolean | null>(null);
  const [showOnline, setShowOnline] = useState<boolean | null>(null);
  const [friendsState, setFriendsState] = useState<SaveState>("idle");
  const [onlineState, setOnlineState] = useState<SaveState>("idle");
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const uploadAvatar = async (file: File | null | undefined) => {
    if (!file || !account) return;
    setAvatarError(null);
    try {
      const data = await fileToAvatarDataUrl(file);
      await pickAvatar(data);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Could not read that image.");
    }
  };

  const pickAvatar = async (id: string) => {
    if (!account) return;
    setSavingAvatar(true);
    setAvatarError(null);
    const previous = account.avatar;
    setAccount({ ...account, avatar: id });
    try {
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Could not save your avatar.");
      }
    } catch (e) {
      setAccount((a) => (a ? { ...a, avatar: previous } : a));
      setAvatarError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const pickFlair = async (flair: string | null) => {
    if (!account) return;
    setSavingFlair(true);
    setFlairError(null);
    const previous = account.flair;
    setAccount({ ...account, flair });
    try {
      const res = await fetch("/api/auth/flair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flair }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Could not save your flair.");
      }
    } catch (e) {
      setAccount((a) => (a ? { ...a, flair: previous } : a));
      setFlairError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSavingFlair(false);
    }
  };

  const saveBio = async () => {
    if (!account) return;
    setBioState("saving");
    setBioError(null);
    try {
      const res = await fetch("/api/auth/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bioDraft.trim() || null }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Could not save your bio.");
      }
      const data = (await res.json()) as { bio: string | null };
      setBioDraft(data.bio ?? "");
      setAccount((a) => (a ? { ...a, bio: data.bio } : a));
      setBioState("saved");
    } catch (e) {
      setBioError(e instanceof Error ? e.message : "Could not save. Try again.");
      setBioState("error");
    }
  };

  // Persist one privacy column. Optimistically flips the local state, rolls back
  // on failure, and drives the per-toggle SaveState for the feedback flash.
  const savePrivacy = async (
    body: { friendsVisibility?: "public" | "private"; showOnline?: boolean },
    apply: () => void,
    rollback: () => void,
    setState: (s: SaveState) => void,
    setError: (e: string | null) => void,
  ) => {
    setState("saving");
    setError(null);
    apply();
    try {
      const res = await fetch("/api/users/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Could not save your setting.");
      }
      setState("saved");
    } catch (e) {
      rollback();
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
      setState("error");
    }
  };

  const toggleFriends = () => {
    if (friendsPublic == null) return;
    const previous = friendsPublic;
    const next = !previous;
    savePrivacy(
      { friendsVisibility: next ? "public" : "private" },
      () => setFriendsPublic(next),
      () => setFriendsPublic(previous),
      setFriendsState,
      setFriendsError,
    );
  };

  const toggleOnline = () => {
    if (showOnline == null) return;
    const previous = showOnline;
    const next = !previous;
    savePrivacy(
      { showOnline: next },
      () => setShowOnline(next),
      () => setShowOnline(previous),
      setOnlineState,
      setOnlineError,
    );
  };

  // The "Saved" flash is transient: clear it back to idle a couple seconds
  // after each successful write so it reads as an acknowledgement, not a label.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const [state, reset] of [
      [bioState, () => setBioState("idle")],
      [friendsState, () => setFriendsState("idle")],
      [onlineState, () => setOnlineState("idle")],
    ] as const) {
      if (state === "saved") timers.push(setTimeout(reset, 2000));
    }
    return () => timers.forEach(clearTimeout);
  }, [bioState, friendsState, onlineState]);

  // Resolve the signed-in account plus the current privacy columns on mount.
  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (cancelled) return;
      setAccount(me);
      if (!me) return;
      setBioDraft(me.bio ?? "");
      fetch("/api/users/settings")
        .then((res) =>
          res.ok
            ? (res.json() as Promise<{ friendsVisibility?: string; showOnline?: boolean }>)
            : null,
        )
        .then((data) => {
          if (cancelled || !data) return;
          setFriendsPublic(data.friendsVisibility !== "private");
          setShowOnline(data.showOnline !== false);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="max-w-3xl mx-auto px-6 py-8">
        {/* Header: back to the player's own profile + the page title. */}
        <div className="flex items-center gap-3">
          {account && (
            <Link
              href={`/u/${encodeURIComponent(account.username)}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg btn-ghost text-parchment-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-leaf"
              aria-label="Back to your profile"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2} />
            </Link>
          )}
          <h1 className="font-display text-3xl sm:text-4xl text-parchment-50">Edit profile</h1>
        </div>

        {account === undefined ? (
          <div className="mt-8 plate p-5 text-sm text-parchment-400">Loading…</div>
        ) : !account ? (
          <div className="mt-8 plate p-4 text-sm text-parchment-300">
            <Link href="/login?next=/profile/edit" className="text-gold-leaf hover:underline">
              Sign in
            </Link>{" "}
            to customize your profile picture, flair, bio, and privacy.
          </div>
        ) : (
          <>
            {/* Profile picture picker */}
            <div className="mt-8">
              <div className="rule-ornament mb-4">
                <span className="font-display">Profile picture</span>
              </div>
              <div className="plate p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  <label
                    className={
                      "grid h-[46px] w-[46px] cursor-pointer place-items-center rounded-lg p-0.5 text-center transition " +
                      (isCustomAvatar(account.avatar)
                        ? "ring-2 ring-gold-leaf"
                        : "ring-1 ring-white/10 hover:ring-white/40")
                    }
                    title="Upload your own picture"
                  >
                    {isCustomAvatar(account.avatar) ? (
                      <PlayerAvatar name={account.username} avatar={account.avatar} size={44} />
                    ) : (
                      <span className="font-display text-xl text-parchment-300 leading-none">+</span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={savingAvatar}
                      onChange={(e) => {
                        uploadAvatar(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {(AVATAR_PICKER_IDS.includes(avatarIdFor(account.username, account.avatar)) ||
                  isCustomAvatar(account.avatar)
                    ? AVATAR_PICKER_IDS
                    : // Keep a retired preset visible (and selectable back) for
                      // accounts that picked it before the catalog was trimmed.
                      [...AVATAR_PICKER_IDS, avatarIdFor(account.username, account.avatar)]
                  ).map((id) => {
                    const selected =
                      !isCustomAvatar(account.avatar) &&
                      avatarIdFor(account.username, account.avatar) === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => pickAvatar(id)}
                        disabled={savingAvatar}
                        aria-label={`Avatar ${id.replace("_", " ")}`}
                        aria-pressed={selected}
                        className={
                          "rounded-lg p-0.5 transition " +
                          (selected
                            ? "ring-2 ring-gold-leaf"
                            : "ring-1 ring-white/10 hover:ring-white/40")
                        }
                      >
                        <PlayerAvatar name={account.username} avatar={id} size={44} />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-parchment-400">
                  Shown in the lobby, on leaderboards, and at the board. Use the + tile to upload
                  your own picture (PNG, JPG, WebP, or GIF, under 8 MB, cropped square and scaled
                  down automatically).
                  {avatarError && <span className="ml-2 text-oxblood-glow">{avatarError}</span>}
                </p>
              </div>
            </div>

            {/* Flair picker: an emoji shown next to the username, Lichess-style. */}
            <div className="mt-8">
              <div className="rule-ornament mb-4">
                <span className="font-display">Flair</span>
              </div>
              <div className="plate p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => pickFlair(null)}
                    disabled={savingFlair}
                    aria-label="No flair"
                    aria-pressed={!account.flair}
                    className={
                      "grid h-[46px] w-[46px] place-items-center rounded-lg text-xs text-parchment-300 transition " +
                      (!account.flair ? "ring-2 ring-gold-leaf" : "ring-1 ring-white/10 hover:ring-white/40")
                    }
                  >
                    none
                  </button>
                  {FLAIR_EMOJI.map((emoji) => {
                    const selected = account.flair === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => pickFlair(emoji)}
                        disabled={savingFlair}
                        aria-label={`Flair ${emoji}`}
                        aria-pressed={selected}
                        className={
                          "grid h-[46px] w-[46px] place-items-center rounded-lg text-2xl transition " +
                          (selected ? "ring-2 ring-gold-leaf" : "ring-1 ring-white/10 hover:ring-white/40")
                        }
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
                {/* The earned one: claimable only while the account holds a top-10
                    leaderboard spot (the server re-checks the rank on every claim). */}
                <div className="mt-4 flex items-center gap-3 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => pickFlair(LAUREL_FLAIR)}
                    disabled={savingFlair}
                    aria-label="Laurelled flair (top-10 exclusive)"
                    aria-pressed={account.flair === LAUREL_FLAIR}
                    className={
                      "grid h-[46px] w-[46px] shrink-0 place-items-center rounded-lg text-2xl transition " +
                      (account.flair === LAUREL_FLAIR
                        ? "ring-2 ring-gold-leaf"
                        : "ring-1 ring-gold/30 hover:ring-gold/60")
                    }
                  >
                    {LAUREL_FLAIR}
                  </button>
                  <p className="text-xs text-parchment-400">
                    <span className="font-display text-gold-leaf">Laurelled</span>, reserved for
                    players currently in the top 10 of a{" "}
                    <Link href="/leaderboard" className="text-gold-leaf hover:underline">
                      leaderboard
                    </Link>
                    . Claim it while your rank holds.
                  </p>
                </div>
                <p className="mt-3 text-xs text-parchment-400">
                  An emoji shown next to your name on your profile and on your avatar around the
                  site. Pick one from the set above.
                  {flairError && <span className="ml-2 text-oxblood-glow">{flairError}</span>}
                </p>
              </div>
            </div>

            {/* Bio: a short "about me" shown read-only on the public profile. */}
            <div className="mt-8">
              <div className="rule-ornament mb-4">
                <span className="font-display">Bio</span>
              </div>
              <div className="plate p-4 sm:p-5">
                <textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value.slice(0, 300))}
                  rows={3}
                  placeholder="Say something about yourself…"
                  aria-label="Profile bio"
                  className="w-full resize-none bg-transparent text-sm text-parchment-100 outline-none focus-visible:outline-none"
                />
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={saveBio}
                    disabled={bioState === "saving" || bioDraft.trim() === (account.bio ?? "")}
                    className="min-h-[44px] rounded-sm btn-ghost px-3 font-display text-gold-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-leaf disabled:opacity-50"
                  >
                    {bioState === "saving" ? "Saving…" : "Save bio"}
                  </button>
                  {bioState === "saved" && (
                    <span className="smallcaps text-[10px] text-verdigris-glow">Saved</span>
                  )}
                  {bioState === "error" && bioError && (
                    <span className="text-xs text-oxblood-glow">{bioError}</span>
                  )}
                  <span className="ml-auto text-xs text-parchment-400 tabular-nums">
                    {bioDraft.length}/300
                  </span>
                </div>
              </div>
            </div>

            {/* Privacy: two independent toggles, each saved on click. */}
            <div className="mt-8">
              <div className="rule-ornament mb-4">
                <span className="font-display">Privacy</span>
              </div>
              <div className="plate divide-y divide-white/5 p-1">
                <PrivacyToggle
                  label="Show my friends list on my profile"
                  description="When off, only you and moderators can see who you are friends with. Your friend count stays visible."
                  on={friendsPublic}
                  onToggle={toggleFriends}
                  state={friendsState}
                  error={friendsError}
                />
                <PrivacyToggle
                  label="Show my online status and last seen"
                  description="When off, your profile hides whether you are online and when you were last active. You still appear in the live lobby while playing."
                  on={showOnline}
                  onToggle={toggleOnline}
                  state={onlineState}
                  error={onlineError}
                />
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

// A real switch: a labelled button with aria-pressed, a 44px target, a
// visible on/off state that is never color-only (the "On"/"Off" text carries
// it), and its own transient saved / error feedback.
function PrivacyToggle({
  label,
  description,
  on,
  onToggle,
  state,
  error,
}: {
  label: string;
  description: string;
  on: boolean | null; // null while the current value is still loading
  onToggle: () => void;
  state: SaveState;
  error: string | null;
}) {
  const loading = on == null;
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm text-parchment-100">{label}</span>
          {state === "saved" && (
            <span className="smallcaps text-[10px] text-verdigris-glow">Saved</span>
          )}
          {state === "error" && error && (
            <span className="text-xs text-oxblood-glow">{error}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-parchment-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!!on}
        aria-label={label}
        disabled={loading || state === "saving"}
        onClick={onToggle}
        className={
          "relative grid h-11 min-h-[44px] w-[72px] shrink-0 grid-cols-2 items-center rounded-full border px-1 transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-leaf motion-reduce:transition-none " +
          (on
            ? "border-gold/40 bg-gold/15"
            : "border-white/10 bg-white/5")
        }
      >
        {/* The label reads regardless of color; the knob just reinforces it. */}
        <span
          className={
            "z-10 text-center smallcaps text-[9px] transition-colors " +
            (on ? "text-gold-leaf" : "text-transparent")
          }
        >
          On
        </span>
        <span
          className={
            "z-10 text-center smallcaps text-[9px] transition-colors " +
            (on ? "text-transparent" : "text-parchment-400")
          }
        >
          Off
        </span>
        <span
          className={
            "absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full shadow transition-all motion-reduce:transition-none " +
            (on ? "left-[calc(100%-2.25rem)] bg-gold-leaf" : "left-1 bg-parchment-300")
          }
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
