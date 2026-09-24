"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Crown, LogIn, LogOut, Paintbrush, Trash2, Trophy, Upload, Users } from "lucide-react";
import { ClubIcon, renderClubIconGlyph } from "@/components/ClubIcon";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLink } from "@/components/PlayerLink";
import { SiteHeader } from "@/components/SiteHeader";
import { useSession } from "@/lib/session/SessionProvider";
import { NotFoundPanel } from "@/app/_components/NotFoundPanel";
import { NOT_FOUND_COPY } from "@/app/_components/notFoundCopy";
import { DetailLoadFailed } from "@/components/social/DetailLoadFailed";
import { FIELD_TEXT } from "@/components/social/fieldText";
import { ClubDetailSkeleton } from "./DetailSkeleton";
import { CLUB_ICON_COLORS, CLUB_ICON_NAMES, encodeClubIcon, isUploadedClubIcon, parseClubIcon } from "@/lib/clubIcons";
import { fileToDataUrl } from "@/lib/imageUpload";
import type { ClubMemberRow, ClubPostRow, ClubTournamentRow } from "@/app/api/clubs/[slug]/route";
import { tournamentPhase, type TournamentPhase } from "@/lib/tournaments";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/Button";

// Club home, lichess-teams-style: description and members on one side, the
// club's events and a members-only message board on the other.

type ClubDetail = {
  club: {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    owner_user_id: string;
    owner_name: string;
    created_at: number;
  };
  members: ClubMemberRow[];
  memberCount: number;
  posts: ClubPostRow[];
  tournaments: ClubTournamentRow[];
  myRole: string | null;
};

// Owner-only icon picker: a curated grid of emblem glyphs and a row of accent
// colors, saved to the club as one "iconName|colorId" string via
// PATCH /api/clubs/[slug].
function ClubIconPicker({
  slug,
  current,
  clubName,
  onSaved,
  onClose,
}: {
  slug: string;
  current: string;
  clubName: string;
  onSaved: (icon: string) => void;
  onClose: () => void;
}) {
  const parsed = parseClubIcon(current);
  const [iconName, setIconName] = useState(parsed?.name ?? CLUB_ICON_NAMES[0]);
  const [colorId, setColorId] = useState(parsed?.color.id ?? CLUB_ICON_COLORS[1].id);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<string | null>(isUploadedClubIcon(current) ? current : null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Remove asks once, inline, like deleting a post (F180).
  const [confirmRemove, setConfirmRemove] = useState(false);
  // A ref, not the state: two saves in the same task both read `saving` as
  // false and would PATCH twice (the F179 class).
  const savingRef = useRef(false);

  const save = async (value: string) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/clubs/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icon: value }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not save the icon.");
      onSaved(value);
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save the icon.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // Read a chosen file, downscale to a small square data URL on the client,
  // then upload it (the server re-validates MIME/size/dimensions). The client
  // budget stays well under the 1 MB server cap so club lists stay light.
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setSaveError(null);
    try {
      const dataUrl = await fileToDataUrl(file, { maxDim: 256, maxChars: 300_000, cover: true });
      setUploaded(dataUrl);
      await save(dataUrl);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not read that image.");
    }
  };

  return (
    <div className="plate mt-5 p-5">
      <div className="flex items-center gap-4">
        <ClubIcon icon={uploaded ?? encodeClubIcon(iconName, colorId)} name={clubName} size={56} />
        <div>
          <div className="font-display text-xl text-parchment">Club icon</div>
          <p className="mt-0.5 text-sm text-parchment-400">Pick an emblem and a color for {clubName}.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {CLUB_ICON_NAMES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setIconName(e)}
            aria-label={`Icon ${e}`}
            aria-pressed={iconName === e}
            className={`grid h-[44px] w-full cursor-pointer place-items-center border transition-colors [@media(pointer:fine)]:h-10 ${
              iconName === e
                ? "border-gold/70 bg-[color:var(--bg-raised)] text-gold-leaf"
                : "border-[color:var(--edge)] bg-[color:var(--bg-base)] text-parchment-200 hover:border-[color:var(--edge-strong)] hover:bg-[color:var(--bg-raised)]"
            }`}
          >
            {renderClubIconGlyph(e, 18)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CLUB_ICON_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setColorId(c.id)}
            aria-label={`Color ${c.label}`}
            aria-pressed={colorId === c.id}
            title={c.label}
            className={`h-[44px] w-[44px] cursor-pointer rounded-full border-2 [@media(pointer:fine)]:h-8 [@media(pointer:fine)]:w-8 transition-[border-color] duration-150 hover:border-parchment-300 ${
              colorId === c.id ? "border-parchment-50" : "border-transparent"
            }`}
            style={{ background: c.hex }}
          />
        ))}
      </div>

      {/* Custom image upload: an alternative to the curated emblem grid. */}
      <div className="mt-4 border-t border-[color:var(--edge)] pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button tone="ghost"
           
            onClick={() => fileRef.current?.click()}
            disabled={saving}
            className="flex px-4 py-2 text-sm disabled:opacity-50">
            <Upload size={14} aria-hidden /> Upload image
          </Button>
          <span className="text-xs text-parchment-500">PNG, JPEG, or WebP. Max 1 MB, 1024px.</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button tone="leaf"
          onClick={() => save(encodeClubIcon(iconName, colorId))}
          loading={saving}
          className="px-4 py-2 text-sm font-semibold disabled:opacity-50">
          Save emblem
        </Button>
        {(parsed || uploaded) &&
          (confirmRemove ? (
            <>
              <Button tone="danger"
                onClick={() => save("")}
                loading={saving}
                className="px-4 py-2 text-sm disabled:opacity-50">
                Remove
              </Button>
              <Button tone="quiet" onClick={() => setConfirmRemove(false)} className="px-4 py-2 text-sm">
                Keep icon
              </Button>
            </>
          ) : (
            <Button tone="ghost"
              onClick={() => setConfirmRemove(true)}
              disabled={saving}
              className="px-4 py-2 text-sm disabled:opacity-50">
              Remove icon
            </Button>
          ))}
        <Button tone="ghost" onClick={onClose} className="px-4 py-2 text-sm">
          Cancel
        </Button>
        {saveError && (
          <span role="alert" className="text-sm text-oxblood-glow">
            {saveError}
          </span>
        )}
      </div>
    </div>
  );
}

const PHASE_LABEL: Record<TournamentPhase, string> = {
  upcoming: "Upcoming",
  ongoing: "In progress",
  finished: "Finished",
};

function timeAgo(at: number): string {
  const s = Math.max(1, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ClubPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [data, setData] = useState<ClubDetail | null>(null);
  // Who is looking, from the shared session (F014): the server hint decides
  // the join and sign-in controls on the first paint. Anything that grants a
  // power (moderating, deleting someone's post) waits for the full user.
  // `ensure` (wave 2): the header gives a first-time visitor a guest account,
  // and guests can do everything this page offers. Without it the page read
  // "signed out" while that mint ran and showed a sign-in prompt that turned
  // into the guest view seconds later. Now the mint reads as unknown; only a
  // failed mint (null) shows the sign-in prompt.
  const { user: me, display } = useSession({ ensure: true });
  const [error, setError] = useState<string | null>(null);
  // A 404 is a missing club, not a failed load (F031).
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [postText, setPostText] = useState("");
  const [postError, setPostError] = useState<string | null>(null);
  // In flight guard for the board post (F179): a second Enter or click while
  // the first post is on its way no longer creates a duplicate.
  const [posting, setPosting] = useState(false);
  const postingRef = useRef(false);
  // Delete asks once, inline (F180): the id awaiting confirmation, the id being
  // deleted, and the last failure, which is shown instead of swallowed.
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pickingIcon, setPickingIcon] = useState(false);

  // Request sequence: only the newest in-flight load may set state, so a
  // stale refresh (or one that resolves after unmount) never lands.
  const loadReqRef = useRef(0);
  const load = useCallback(async () => {
    const req = ++loadReqRef.current;
    const res = await fetch(`/api/clubs/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      if (res.status === 404 && req === loadReqRef.current) setMissing(true);
      throw new Error(res.status === 404 ? "That club doesn't exist." : "Could not load the club.");
    }
    const body = (await res.json()) as ClubDetail;
    if (req !== loadReqRef.current) return;
    setData(body);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    // The ref object itself (not .current) is stable; aliased so the cleanup
    // can invalidate any load still in flight.
    const reqRef = loadReqRef;
    void (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the club.");
      }
    })();
    return () => {
      cancelled = true;
      reqRef.current++;
    };
  }, [load]);

  // A ref guard, not only the disabled state: two presses in the same task
  // both see busy as false (the F179 class).
  const busyRef = useRef(false);
  const membership = async (action: "join" | "leave") => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${encodeURIComponent(slug)}/membership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "That didn't work.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const submitPost = async (event: FormEvent) => {
    event.preventDefault();
    if (!postText.trim() || postingRef.current) return;
    postingRef.current = true;
    setPosting(true);
    setPostError(null);
    const sent = postText;
    try {
      const res = await fetch(`/api/clubs/${encodeURIComponent(slug)}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sent }),
      });
      const body = (await res.json().catch(() => ({}))) as { post?: ClubPostRow; error?: string };
      if (!res.ok || !body.post) throw new Error(body.error || "Could not post.");
      setData((d) => (d ? { ...d, posts: [body.post!, ...d.posts] } : d));
      // Only clear what was sent, never text typed while it was in flight.
      setPostText((cur) => (cur === sent ? "" : cur));
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "Could not post.");
    } finally {
      postingRef.current = false;
      setPosting(false);
    }
  };

  const deletePost = async (id: string) => {
    setDeleting(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/clubs/${encodeURIComponent(slug)}/posts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not delete the post.");
      setData((d) => (d ? { ...d, posts: d.posts.filter((p) => p.id !== id) } : d));
      setConfirmDelete(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete the post.");
    } finally {
      setDeleting(null);
    }
  };

  if (missing && !data) {
    return <NotFoundPanel {...NOT_FOUND_COPY.club} />;
  }
  if (error && !data) {
    return (
      <DetailLoadFailed
        active="/clubs"
        title="This club could not load"
        detail="The server did not answer. Your membership is unaffected."
        retry={load}
        back={{ href: "/clubs", label: "All clubs" }}
      />
    );
  }

  const club = data?.club;
  const isOwner = data?.myRole === "owner";
  const isMember = data?.myRole != null;
  const mayModerate = isOwner || me?.role === "mod" || me?.role === "admin";

  return (
    <main className="min-h-screen pb-16">
      <SiteHeader active="/clubs" />
      <section className="mx-auto max-w-6xl px-5 pt-6 sm:px-6 sm:pt-8">
        {!club ? (
          // loading.tsx carries an sr-only h1, but it only renders on a hard
          // navigation. Arriving from inside the app (a link on /clubs) skips
          // it entirely and lands straight in this branch, which left the
          // route with no heading at all for the whole fetch. Same generic
          // wording as loading.tsx; the loaded page replaces it with the real
          // club name. This page is not used as a Suspense fallback anywhere,
          // so there is no phase where two of these are live at once.
          // The body is the route skeleton, not a "Loading…" line (F022).
          <div aria-busy="true">
            <h1 className="sr-only">Club</h1>
            <ClubDetailSkeleton />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-0 items-center gap-4">
                <ClubIcon icon={club.icon} name={club.name} size={64} />
                <div className="min-w-0">
                <h1 className="truncate page-title">{club.name}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-parchment-400">
                  <span className="flex items-center gap-1.5">
                    <Crown size={13} className="shrink-0 text-gold-leaf" aria-hidden />
                    {/* 66.1x18 on a coarse pointer while it spelled its own
                        anchor; PlayerLink is where the 44px hit area lives. */}
                    <PlayerLink name={club.owner_name} className="min-w-0 hover:text-gold-leaf" />
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={13} aria-hidden /> {data.memberCount} member{data.memberCount === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={13} aria-hidden /> since {new Date(club.created_at).toLocaleDateString()}
                  </span>
                </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {mayModerate && (
                  <Button tone="ghost"
                    onClick={() => setPickingIcon((v) => !v)}
                    className="flex px-4 py-2 text-sm">
                    <Paintbrush size={14} aria-hidden />{" "}
                    {parseClubIcon(club.icon) || isUploadedClubIcon(club.icon) ? "Change icon" : "Pick an icon"}
                  </Button>
                )}
                {/* Drawn while the session is still unknown too (disabled),
                    so a first visit's guest mint does not insert the button
                    into an empty row. */}
                {display !== null && !isMember && (
                  <Button tone="leaf"
                    onClick={() => membership("join")}
                    disabled={busy || !display}
                    className="flex px-4 py-2 text-sm font-semibold disabled:opacity-50">
                    <LogIn size={14} aria-hidden /> Join club
                  </Button>
                )}
                {/* A signed-out visitor gets a way in, back to this club
                    (F036), the same as the tournament page. */}
                {display === null && (
                  <LinkButton tone="leaf"
                    href={`/login?next=${encodeURIComponent(`/clubs/${club.slug}`)}`}
                    className="flex px-4 py-2 text-sm font-semibold">
                    <LogIn size={14} aria-hidden /> Sign in to join
                  </LinkButton>
                )}
                {isMember && !isOwner && (
                  <Button tone="ghost"
                    onClick={() => membership("leave")}
                    disabled={busy}
                    className="flex px-4 py-2 text-sm disabled:opacity-50">
                    <LogOut size={14} aria-hidden /> Leave
                  </Button>
                )}
                {isMember && (
                  <LinkButton tone="ghost"
                    href={`/tournaments?club=${encodeURIComponent(club.id)}`}
                    className="flex px-4 py-2 text-sm">
                    <Trophy size={14} aria-hidden /> New event
                  </LinkButton>
                )}
              </div>
            </div>

            {pickingIcon && (
              <ClubIconPicker
                slug={club.slug}
                current={club.icon}
                clubName={club.name}
                onSaved={(icon) => setData((d) => (d ? { ...d, club: { ...d.club, icon } } : d))}
                onClose={() => setPickingIcon(false)}
              />
            )}

            {error && (
              <div role="alert" className="mt-5 plate border-oxblood-glow/60 bg-oxblood/15 px-4 py-3 text-sm text-parchment">
                {error}
              </div>
            )}
            {club.description && <p className="mt-4 max-w-2xl text-parchment-300">{club.description}</p>}

            <div className="mt-8 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="flex flex-col gap-4">
                {/* Members, sorted by rating, doubles as the club leaderboard. */}
                <div className="plate overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-[color:var(--edge)] px-5 py-3">
                    <span className="text-[12px] text-parchment-400">Leaderboard</span>
                    <span className="text-[12px] text-parchment-500">
                      {data.memberCount} member{data.memberCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="max-h-96 divide-y divide-[color:var(--edge)] overflow-y-auto">
                    {data.members.map((m, i) => (
                      <li key={m.user_id}>
                        {/* The row IS the link (design system: interactive rows
                            are clickable, not just their text), so the row is
                            what has to reach 44px. It measured 36 tall on a
                            coarse pointer. Nothing here can go through
                            PlayerLink: the name already sits inside this
                            anchor, and an anchor cannot nest. */}
                        <Link
                          href={`/u/${encodeURIComponent(m.username)}`}
                          className="flex min-h-[44px] items-center gap-2.5 px-5 py-2 transition-colors hover:bg-[color:var(--bg-raised)] [@media(pointer:fine)]:min-h-0"
                        >
                          <span className="w-4 shrink-0 font-mono text-[12px] text-parchment-500">{i + 1}</span>
                          <PlayerAvatar name={m.username} avatar={m.avatar} size={22} />
                          <span className="min-w-0 truncate text-sm text-parchment-100">
                            {m.username}
                            {m.role === "owner" && (
                              <Crown size={11} className="ml-1.5 inline text-gold-leaf" aria-label="Owner" />
                            )}
                          </span>
                          <span className="ml-auto shrink-0 font-mono text-xs text-parchment-400">
                            {Math.round(m.rating)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Club events */}
                <div className="plate overflow-hidden">
                  <div className="border-b border-[color:var(--edge)] px-5 py-3 text-[12px] text-parchment-400">
                    Events
                  </div>
                  {data.tournaments.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-parchment-400">No events yet.</p>
                  ) : (
                    <ul className="divide-y divide-[color:var(--edge)]">
                      {data.tournaments.map((t) => (
                        <li key={t.id}>
                          {/* The row is the link to the event, with the phase
                              in sentence case (F170). */}
                          <Link
                            href={`/tournaments/${encodeURIComponent(t.id)}`}
                            className="group block min-h-[44px] px-5 py-2.5 transition-colors hover:bg-[color:var(--bg-raised)]"
                          >
                            <div className="truncate text-sm text-parchment-100 group-hover:text-gold-leaf">{t.name}</div>
                            <div className="mt-0.5 text-[12px] text-parchment-400">
                              {PHASE_LABEL[t.status === "finished" ? "finished" : tournamentPhase(t.starts_at, t.duration_min)]} ·{" "}
                              {t.players}/{t.max_players} players
                              {t.starts_at ? ` · ${new Date(t.starts_at).toLocaleString()}` : ""}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Message board */}
              <div className="plate flex h-fit flex-col overflow-hidden">
                <div className="border-b border-[color:var(--edge)] px-5 py-3 text-[12px] text-parchment-400">
                  Club board
                </div>
                {isMember ? (
                  <form onSubmit={submitPost} className="border-b border-[color:var(--edge)] px-5 py-4">
                    <textarea
                      value={postText}
                      onChange={(e) => setPostText(e.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder={`Message the members of ${club.name}…`}
                      aria-label={`Message the members of ${club.name}`}
                      className={`w-full resize-none border border-[color:var(--edge)] bg-[color:var(--bg-base)] px-3 py-2 ${FIELD_TEXT} text-parchment focus:border-[color:var(--edge-strong)] focus:outline-none`}
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {postError ? (
                        <span role="alert" className="text-xs text-oxblood-glow">{postError}</span>
                      ) : (
                        <span className="text-[12px] text-parchment-500">Visible to everyone; members can post.</span>
                      )}
                      <Button tone="leaf"
                        type="submit"
                        disabled={!postText.trim()}
                        loading={posting}
                        className="px-4 py-1.5 text-[13px] font-semibold disabled:opacity-50">
                        Post
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="border-b border-[color:var(--edge)] px-5 py-3 text-sm text-parchment-400">
                    {display !== null ? (
                      "Join the club to post on its board."
                    ) : (
                      <>
                        <Link
                          href={`/login?next=${encodeURIComponent(`/clubs/${club.slug}`)}`}
                          className="text-gold-leaf underline underline-offset-2"
                        >
                          Sign in
                        </Link>{" "}
                        and join to post.
                      </>
                    )}
                  </p>
                )}
                {deleteError && (
                  <p role="alert" className="border-b border-[color:var(--edge)] px-5 py-2.5 text-[13px] text-oxblood-glow">
                    {deleteError}
                  </p>
                )}
                {data.posts.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-parchment-400">Nothing posted yet.</p>
                ) : (
                  <ul className="divide-y divide-[color:var(--edge)]">
                    {data.posts.map((p) => (
                      <li key={p.id} className="group px-5 py-3">
                        <div className="flex items-center gap-2">
                          <PlayerLink
                            name={p.username}
                            avatar={p.avatar}
                            className="min-w-0 text-sm font-medium text-parchment-100 hover:text-gold-leaf"
                          />
                          <span className="text-[12px] text-parchment-500">{timeAgo(p.created_at)}</span>
                          {(mayModerate || p.user_id === me?.id) &&
                            (confirmDelete === p.id ? (
                              <span className="ml-auto flex items-center gap-1">
                                <Button
                                  tone="danger"
                                  size="xs"
                                  loading={deleting === p.id}
                                  onClick={() => deletePost(p.id)}
                                >
                                  Delete
                                </Button>
                                <Button tone="quiet" size="xs" onClick={() => setConfirmDelete(null)}>
                                  Keep
                                </Button>
                              </span>
                            ) : (
                              // Shown on hover, on keyboard focus anywhere in the
                              // post, and always on a touch screen, with a 44px
                              // target there (F180). It asks before deleting.
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteError(null);
                                  setConfirmDelete(p.id);
                                }}
                                className="ml-auto grid min-h-[44px] min-w-[44px] place-items-center text-parchment-400 opacity-0 transition-opacity hover:text-oxblood-glow focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100 [@media(pointer:fine)]:min-h-[28px] [@media(pointer:fine)]:min-w-[28px]"
                                aria-label="Delete post"
                              >
                                <Trash2 size={16} aria-hidden />
                              </button>
                            ))}
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-parchment-200">{p.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
