"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Crown,
  Flag,
  Gamepad2,
  MessageSquare,
  MoreHorizontal,
  Share2,
  Swords,
  Trophy,
  UserCheck,
  UserPlus,
  UserX,
} from "lucide-react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { achievementIcon } from "@/lib/achievementIcons";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLink } from "@/components/PlayerLink";
import { PresenceBadge } from "@/components/PresenceBadge";
import { EmptyState } from "@/components/EmptyState";
import { ModeBadge } from "@/components/ModeBadge";
import { SiteHeader } from "@/components/SiteHeader";
import { PlayerStatsPanel } from "@/components/PlayerStatsPanel";
import type { PlayerStats } from "@/lib/playerStats";
import type { RatingPoint } from "@/components/RatingChart";
import { ModeRatingCard } from "@/components/ratings/ModeRatingCard";
import {
  RatingHistoryPanel,
  recentRatingDelta,
  type HistoryPoint,
} from "@/components/ratings/RatingHistoryPanel";
import { type RecentGameRow } from "@/components/profile/RecentGameCard";
import { FriendsModule } from "@/components/profile/FriendsModule";
import { relativeTime } from "@/components/profile/relativeTime";
import { usePresence } from "@/lib/presence";
import { ACTIVE_RATING_CATEGORIES, MODE_RATING_CATEGORIES } from "@/lib/ratingCategories";
import { clockLabel } from "@/lib/tournaments";
import { placementTitle, type LaurelPlacement } from "@/lib/laurels";
import { LaurelBadge, useTopPlacements } from "@/components/LaurelBadge";
import { isHouseEditor, isRatingEditor } from "@/lib/godPanel";
import { fileToDataUrl } from "@/lib/imageUpload";
import type { DraftMode } from "@/engine/buff";

type Relationship = "self" | "none" | "friends" | "incoming" | "outgoing";

interface ProfileUser {
  username: string;
  avatar?: string | null;
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: number;
  role: "user" | "mod" | "admin";
  bio: string | null;
  flair: string | null;
  // Extended privacy / social fields (profile-contracts.md).
  lastSeenAt: number | null;
  showOnline: boolean;
  friendsVisibility: "public" | "private";
  friendCount: number;
}

interface CategoryRatingRow {
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  peak: number;
}

type ProfileRatingPoint = RatingPoint & { category?: string | null };

interface ProfileData {
  user: ProfileUser;
  // The player's current live game, resolved server-side from the authoritative
  // live-seat index. Null (or absent, on an older API) when not playing.
  currentGame?: { gameId: string; mode?: "nerf" | "buff" } | null;
  games: unknown[];
  ratings?: Record<string, CategoryRatingRow>;
  ratingHistory: ProfileRatingPoint[];
  relationship: Relationship | null;
  mutualFriends: { username: string; avatar: string | null }[];
}

// useSearchParams (for the ?tab= state) must sit under a Suspense boundary, so
// the page shell renders SiteHeader immediately and defers the data-driven body.
export default function ProfilePage() {
  return (
    <main className="min-h-screen pb-16">
      <SiteHeader />
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </main>
  );
}

function ProfileContent() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = String(params.username ?? "");

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [me, setMe] = useState<AccountUser | null>(null);
  const [missing, setMissing] = useState(false);
  // A network / server failure on the primary profile fetch (distinct from a
  // 404, which is `missing`): without this a dropped request left the page
  // stuck on the skeleton forever. Surfaces a visible error + Retry instead.
  const [loadError, setLoadError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [reporting, setReporting] = useState(false);
  // Set only when the viewer is the designated house editor (ilovenewjeans) AND
  // this profile is a house bot: carries the bot's persona id and the pickable
  // avatar catalog so the inline editor can rename it, swap its pfp, or set its
  // bio. Null for everyone else, so house-bot status stays invisible to others.
  const [houseEdit, setHouseEdit] = useState<{ userId: string; avatars: string[] } | null>(null);
  // The newest finished game, for the recent-game module (fetched from the games
  // endpoint so it carries `mode`; the profile payload's games do not).
  const [newestGame, setNewestGame] = useState<RecentGameRow | null | undefined>(undefined);

  // Friend button state machine, seeded from the payload relationship and driven
  // locally by the header's Add / Accept / Remove actions.
  const [rel, setRel] = useState<Relationship | null>(null);
  const [friendBusy, setFriendBusy] = useState(false);

  // Client-side profile->profile navigation re-renders this component without a
  // remount: clear the previous player's state during render (React's sanctioned
  // reset-on-key-change) so stale data never sticks to the new username while the
  // fetch below is in flight.
  const [seenUser, setSeenUser] = useState(username);
  if (seenUser !== username) {
    setSeenUser(username);
    setMissing(false);
    setLoadError(false);
    setProfile(null);
    setStats(null);
    setHouseEdit(null);
    setNewestGame(undefined);
    setRel(null);
    setReporting(false);
  }

  // Load the profile payload, stats, the signed-in account, and (house editor
  // only) the persona roster.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data: ProfileData;
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
        if (cancelled) return;
        if (res.status === 404) {
          setMissing(true);
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const payload = (await res.json()) as ProfileData & { redirectTo?: string };
        // Renamed account: the API resolved this old name to a current profile.
        // Forward to the canonical /u/<currentName> (replace, so Back does not
        // bounce through the dead old name).
        if (payload.redirectTo && payload.redirectTo.toLowerCase() !== username.toLowerCase()) {
          router.replace(`/u/${encodeURIComponent(payload.redirectTo)}`);
          return;
        }
        data = payload;
      } catch {
        // Network drop or 5xx: show a retryable error instead of an endless
        // skeleton. A 404 is handled above as "not found".
        if (!cancelled) setLoadError(true);
        return;
      }
      if (cancelled) return;
      setProfile(data);
      setRel(data.relationship);

      fetch(`/api/users/${encodeURIComponent(username)}/stats`)
        .then((r) => (r.ok ? (r.json() as Promise<{ stats: PlayerStats }>) : null))
        .then((s) => {
          if (!cancelled && s) setStats(s.stats);
        })
        .catch(() => {});

      const account = await fetchMe();
      if (cancelled) return;
      setMe(account);
      // House editor (ilovenewjeans only): learn whether this profile is a bot
      // and, if so, load its persona id + the pickable avatar catalog. The
      // personas endpoint is authorized for this account and 403s for everyone
      // else, so a non-editor never even learns the roster.
      if (account && isHouseEditor(account.username)) {
        try {
          const res2 = await fetch("/api/mod/house/personas");
          if (!res2.ok || cancelled) return;
          const payload = (await res2.json()) as {
            personas: { userId: string; effective: { username: string } }[];
            avatars: string[];
          };
          const match = payload.personas.find(
            (p) => p.effective.username.toLowerCase() === data.user.username.toLowerCase(),
          );
          if (match && !cancelled) setHouseEdit({ userId: match.userId, avatars: payload.avatars });
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
    // reloadTick re-runs the primary fetch when the user taps Retry after a
    // load error. Every other value the body touches (setState updaters,
    // fetchMe, isHouseEditor) is a stable import or setter, so the two reactive
    // inputs below are the complete dependency set. router is Next's stable
    // App Router instance (used only for the renamed-account redirect).
  }, [username, reloadTick, router]);

  // Newest finished game (limit 1, no filters) for the recent-game module. Kept
  // separate from the Games tab feed so a finished live game can refetch it.
  const loadNewestGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/games?limit=1`);
      if (!res.ok) return;
      const body = (await res.json()) as { games: RecentGameRow[] };
      setNewestGame(body.games[0] ?? null);
    } catch {
      setNewestGame((g) => (g === undefined ? null : g));
    }
  }, [username]);

  useEffect(() => {
    // loadNewestGame only setState after awaiting the fetch (never synchronously);
    // the lint rule can't see past the await boundary. Same pattern as FriendsModule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNewestGame();
  }, [loadNewestGame]);

  // Live presence for the game module and the header badge.
  const presence = usePresence(username);

  // The game id a finished live game reported, so the module can swap to the
  // recent-game card without a reload even though the profile payload still
  // carries the (now stale) currentGame id.

  const isOwner = profile?.relationship === "self";

  // Current top-10 leaderboard honors, derived from the cached standings the
  // leaderboard endpoint already serves. Empty for the unlaurelled.
  const placements = useTopPlacements(profile?.user.username);

  const tab: "activity" | "games" = searchParams.get("tab") === "games" ? "games" : "activity";
  const setTab = (next: "activity" | "games") => {
    router.replace(`/u/${encodeURIComponent(username)}${next === "games" ? "?tab=games" : ""}`, {
      scroll: false,
    });
  };

  if (missing) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <h1 className="font-display text-4xl">Player not found</h1>
        <p className="mt-3 text-parchment-200">No account with that name.</p>
        <Link href="/lobby" className="mt-6 inline-flex btn-leaf px-4 py-2 font-display text-sm font-semibold">
          Back to the lobby
        </Link>
      </section>
    );
  }

  if (loadError && !profile) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <div className="plate flex flex-col items-center gap-3 p-8 text-center">
          <h1 className="font-display text-2xl">Could not load this profile</h1>
          <p className="text-sm text-parchment-300">
            Something went wrong reaching the server. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoadError(false);
              setReloadTick((t) => t + 1);
            }}
            className="btn-ghost inline-flex min-h-[44px] items-center px-5 font-display text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!profile) return <ProfileSkeleton />;

  const user = profile.user;
  const ratingHistory = profile.ratingHistory as HistoryPoint[];
  const currentRatings: Record<string, number | undefined> = Object.fromEntries(
    ACTIVE_RATING_CATEGORIES.map((c) => [c.id, profile.ratings?.[c.id]?.rating]),
  );

  // Presence chip is suppressed entirely when the player hides their online
  // status and the viewer is not the owner (spec 2.2 / section 5).
  const showPresence = user.showOnline || isOwner;

  // The presence feed only sees players on the lobby socket, so an owner
  // browsing their own profile derives as "offline" ("Last seen 15s ago" while
  // they are literally looking at the page). They are demonstrably here:
  // upgrade offline to online for the owner's own badge. Other viewers keep
  // the raw feed state.
  const headerPresenceState =
    isOwner && presence.state === "offline" ? "online" : presence.state;

  // Live game id for the "Playing right now" module. The profile payload's
  // currentGame (resolved server-side from the DO's authoritative live-seat
  // index) is the primary signal; the lobby-feed presence is the fallback for
  // an older API payload. A game the card already reported ended is retired so
  // the recent-game module can take over without a reload.
  const apiLiveId = profile.currentGame?.gameId ?? null;
  const presenceLiveId =
    presence.state === "in-game" ? (presence.gameId ?? presence.game?.id ?? null) : null;
  const liveGameIdRaw = apiLiveId ?? presenceLiveId;
  const liveGameId = liveGameIdRaw || null;
  const liveGameMode = profile.currentGame?.mode ?? presence.game?.mode ?? null;
  // The lobby entry adds metadata (time control, rated, watchers) but only when
  // it describes the SAME game; a mismatched entry means one side is stale.
  const liveLobbyEntry = presence.game && presence.game.id === liveGameId ? presence.game : null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
      {/* ---- Header (spec 2.2) ---------------------------------------------- */}
      <ProfileHeader
        user={user}
        liveGameId={liveGameId}
        isOwner={isOwner}
        me={me}
        rel={rel}
        friendBusy={friendBusy}
        placements={placements}
        presenceMode={presence.game?.mode ?? null}
        presenceState={headerPresenceState}
        showPresence={showPresence}
        ratings={profile.ratings}
        onAddFriend={async () => {
          setFriendBusy(true);
          setRel("outgoing");
          try {
            const r = await fetch("/api/friends", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "request", username: user.username }),
            });
            if (!r.ok) setRel("none");
          } catch {
            setRel("none");
          } finally {
            setFriendBusy(false);
          }
        }}
        onAcceptFriend={async () => {
          setFriendBusy(true);
          const prev = rel;
          setRel("friends");
          try {
            const r = await fetch("/api/friends", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "accept", username: user.username }),
            });
            if (!r.ok) setRel(prev);
          } catch {
            setRel(prev);
          } finally {
            setFriendBusy(false);
          }
        }}
        onRemoveFriend={async () => {
          setFriendBusy(true);
          const prev = rel;
          setRel("none");
          try {
            const r = await fetch("/api/friends", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "remove", username: user.username }),
            });
            if (!r.ok) setRel(prev);
          } catch {
            setRel(prev);
          } finally {
            setFriendBusy(false);
          }
        }}
        onReport={() => setReporting(true)}
      />

      {/* House-bot inline editor (house editor only); everyone else sees the
          read-only bio rendered inside the header component. */}
      {houseEdit && (
        <HouseBotEditor
          userId={houseEdit.userId}
          avatars={houseEdit.avatars}
          username={user.username}
          avatar={user.avatar ?? null}
          bio={user.bio}
          rating={
            profile.ratings?.nerf?.rating ??
            profile.ratings?.buff?.rating ??
            (user.rating || null)
          }
          onIdentity={(nextName, nextAvatar) => {
            if (nextName.toLowerCase() !== user.username.toLowerCase()) {
              router.push(`/u/${encodeURIComponent(nextName)}`);
            } else {
              setProfile((p) => (p ? { ...p, user: { ...p.user, avatar: nextAvatar } } : p));
            }
          }}
          onBio={(bio) => setProfile((p) => (p ? { ...p, user: { ...p.user, bio } } : p))}
          onRating={(rating) =>
            setProfile((p) =>
              p ? { ...p, user: { ...p.user, rating }, ratings: ratingsWithAllSet(p.ratings, rating) } : p,
            )
          }
        />
      )}

      {/* Rating editor (ilovenewjeans only): overwrite every rating bucket for
          this player at once. Server re-verifies the gate; this is UX only.
          Hidden on house-bot profiles (houseEdit is set only there): a bot's
          rating is edited from the House bot menu above instead, which persists
          it as an override the engine resync respects. */}
      {isRatingEditor(me?.username) && !houseEdit && (
        <RatingEditor
          key={user.username}
          username={user.username}
          current={
            profile.ratings?.nerf?.rating ??
            profile.ratings?.buff?.rating ??
            (user.rating || null)
          }
          onApplied={(appliedUsername, rating) => {
            setProfile((p) => {
              // Ignore a stale save that resolved after the viewer navigated to a
              // different profile (the callback still targets the old username).
              if (!p || p.user.username.toLowerCase() !== appliedUsername.toLowerCase()) return p;
              return { ...p, user: { ...p.user, rating }, ratings: ratingsWithAllSet(p.ratings, rating) };
            });
          }}
        />
      )}

      {/* ---- Rating cards (spec 2.4) --------------------------------------- */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MODE_RATING_CATEGORIES.map((c) => {
          const placement = placements.find((p) => p.category === c.id);
          return (
            <ModeRatingCard
              key={c.id}
              category={c}
              row={profile.ratings?.[c.id] ?? null}
              recentDelta={recentRatingDelta(ratingHistory, c.id, 7)}
              rank={placement?.rank ?? null}
            />
          );
        })}
      </div>

      {/* ---- Game module: a single quiet line. The big recent-game bar is
           gone (owner request); a live game reads as one pulsing symbol plus a
           Watch link, and the empty state survives only for brand-new accounts. */}
      <div className="mt-4">
        {liveGameId ? (
          <Link
            href={`/game/${encodeURIComponent(liveGameId)}`}
            className="plate plate-hover flex min-h-[44px] items-center gap-2.5 px-3 py-2 no-underline"
            title="Watch the live game"
          >
            <span aria-hidden className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--pos-rgb))] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[rgb(var(--pos-rgb))]" />
            </span>
            <span className="min-w-0 truncate text-[13px] font-display font-semibold text-parchment-100">
              Playing now
            </span>
            {liveGameMode && <ModeBadge mode={liveGameMode} />}
            <span className="ml-auto shrink-0 text-[13px] text-gold-leaf">Watch</span>
          </Link>
        ) : newestGame !== null ? null : (
          <EmptyState
            icon={Gamepad2}
            title={isOwner ? "You have not played online yet" : "No games yet"}
            body={
              isOwner
                ? "Play a rated game to start a rating, fill in this profile, and show up on the leaderboard."
                : "This player has not finished an online game yet. Check back after their first match."
            }
            action={isOwner ? { href: "/lobby", label: "Find a match" } : undefined}
          />
        )}
      </div>

      {/* ---- Main column + Friends (spec 2.6 / 2.7) ------------------------- */}
      <div className="mt-8 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-6">
        <div className="min-w-0">
          {/* Tabs. Sticky to the top on mobile so switching sections stays in
              reach while scrolling a long history; the solid page ink keeps
              rows from bleeding through (no blur, per the design system). */}
          <div
            role="tablist"
            aria-label="Profile sections"
            className="sticky top-0 z-20 -mx-5 flex items-center gap-1 border-b bg-ink-900 px-5 sm:static sm:mx-0 sm:bg-transparent sm:px-0"
            style={{ borderColor: "var(--edge)" }}
          >
            <TabButton id="activity" label="Activity" active={tab === "activity"} onSelect={() => setTab("activity")} />
            <TabButton id="games" label="Games" active={tab === "games"} onSelect={() => setTab("games")} />
          </div>

          <div
            role="tabpanel"
            id="panel-activity"
            aria-labelledby="tab-activity"
            hidden={tab !== "activity"}
            className="pt-4"
          >
            {placements.length > 0 && <CurrentStandings placements={placements} />}
            <AchievementsStrip username={user.username} />
            {stats && (
              <div className="mt-6">
                <h2 className="font-display text-2xl">Statistics</h2>
                <div className="mt-3">
                  <PlayerStatsPanel stats={stats} />
                </div>
              </div>
            )}
            {ratingHistory.length > 0 && (
              <div className="mt-6">
                <div className="rule-ornament mb-3">
                  <span className="font-display">Rating history</span>
                </div>
                <RatingHistoryPanel
                  key={user.username}
                  points={ratingHistory}
                  currentRatings={currentRatings}
                />
              </div>
            )}
          </div>

          <div
            role="tabpanel"
            id="panel-games"
            aria-labelledby="tab-games"
            hidden={tab !== "games"}
            className="pt-4"
          >
            <GamesTab
              username={user.username}
              user={user}
              playingNow={presence.state === "in-game"}
              active={tab === "games"}
            />
          </div>
        </div>

        {/* Friends: a right column on xl, stacked full-width below it. */}
        <aside className="mt-8 xl:mt-0">
          <FriendsModule username={user.username} isOwner={isOwner} />
        </aside>
      </div>

      {reporting && <ReportModal username={user.username} onClose={() => setReporting(false)} />}
    </section>
  );
}

// ---- Header -----------------------------------------------------------------

function ProfileHeader({
  user,
  liveGameId,
  isOwner,
  me,
  rel,
  friendBusy,
  placements,
  presenceMode,
  presenceState,
  showPresence,
  ratings,
  onAddFriend,
  onAcceptFriend,
  onRemoveFriend,
  onReport,
}: {
  user: ProfileUser;
  liveGameId: string | null;
  isOwner: boolean;
  me: AccountUser | null;
  rel: Relationship | null;
  friendBusy: boolean;
  placements: LaurelPlacement[];
  presenceMode: DraftMode | null;
  presenceState: ReturnType<typeof usePresence>["state"];
  showPresence: boolean;
  ratings?: Record<string, CategoryRatingRow>;
  onAddFriend: () => void;
  onAcceptFriend: () => void;
  onRemoveFriend: () => void;
  onReport: () => void;
}) {
  // Strongest current rating (best of the mode buckets) for the inline chip.
  const best = useMemo(() => {
    let top: { c: (typeof MODE_RATING_CATEGORIES)[number]; r: CategoryRatingRow } | null = null;
    for (const c of MODE_RATING_CATEGORIES) {
      const r = ratings?.[c.id];
      if (r && (!top || r.rating > top.r.rating)) top = { c, r };
    }
    return top;
  }, [ratings]);

  // Recognition dressing, driven by the best current board rank: any podium
  // (top-3) placement earns the avatar a subtle gold ring, and a reigning #1
  // a tiny crown floating above it. Derived from the live standings — drop
  // off the podium and it simply stops rendering.
  const bestRank = placements[0]?.rank ?? null;
  const podiumHolder = bestRank != null && bestRank <= 3;
  const reigning = bestRank === 1;

  const crown = reigning ? (
    <span
      title="Reigning #1"
      role="img"
      aria-label="Reigning #1"
      className="absolute -top-2.5 left-1/2 -translate-x-1/2"
    >
      {/* The LaurelBadge crown, alone: static and small on purpose. */}
      <svg viewBox="6.5 1 11 7" width={14} height={9} fill="var(--sun-glow)" aria-hidden="true">
        <path d="M8.2 7.4 7.4 2.9 9.9 4.5 12 1.6l2.1 2.9 2.5-1.6-.8 4.5C14.6 6.9 13.3 6.6 12 6.6c-1.3 0-2.6.3-3.8.8z" />
      </svg>
    </span>
  ) : null;

  const ring = podiumHolder ? "ring-2 ring-sun/45" : "";
  const avatar = (
    <>
      <span className="relative inline-block sm:hidden">
        <PlayerAvatar name={user.username} avatar={user.avatar} size={56} className={ring} />
        {crown}
      </span>
      <span className="relative hidden sm:block">
        <PlayerAvatar name={user.username} avatar={user.avatar} size={72} className={ring} />
        {crown}
      </span>
    </>
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {isOwner ? (
          <Link
            href="/profile/edit"
            title="Edit your profile picture"
            aria-label="Edit your profile picture"
            className="group relative shrink-0 self-start rounded-md ring-1 ring-transparent transition hover:ring-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-leaf"
          >
            {avatar}
            <span className="absolute inset-x-0 bottom-0 hidden bg-black/70 py-0.5 text-center text-[12px] leading-none text-parchment-100 group-hover:block">
              Edit
            </span>
          </Link>
        ) : (
          <div className="shrink-0 self-start">{avatar}</div>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 break-words font-display text-3xl sm:text-4xl">
              {user.username}
              {liveGameId && (
                <span
                  aria-label="In a live game"
                  title="In a live game"
                  className="relative ml-2 inline-flex h-3 w-3 align-middle"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--pos-rgb))] opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[rgb(var(--pos-rgb))]" />
                </span>
              )}
              {user.flair && (
                <span className="ml-2 align-middle text-2xl" aria-hidden="true">
                  {user.flair}
                </span>
              )}
              {placements.length > 0 && (
                // A touch larger for a podium holder, matching the avatar ring.
                <LaurelBadge
                  rank={placements[0].rank}
                  title={placementTitle(placements[0])}
                  size={podiumHolder ? 28 : 24}
                  className="ml-2"
                />
              )}
            </h1>
            {user.role !== "user" && (
              <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[12px] font-medium leading-none text-gold-leaf">
                {user.role === "admin" ? "Admin" : "Moderator"}
              </span>
            )}
            {best && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.03] px-2 py-0.5"
                style={{ border: "1px solid var(--edge)" }}
              >
                <best.c.icon className="h-3 w-3" style={{ color: best.c.accent }} strokeWidth={2.2} aria-hidden />
                <span className="font-mono text-xs tabular-nums text-parchment-100">{Math.round(best.r.rating)}</span>
                <span className="text-[12px] text-parchment-400">{best.c.label}</span>
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-parchment-300">
            {showPresence && (
              <PresenceBadge state={presenceState} mode={presenceMode} lastSeenAt={user.lastSeenAt} />
            )}
            <span className="text-parchment-400">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>

          {user.bio && (
            <p className="mt-3 max-w-prose whitespace-pre-wrap text-sm text-parchment-200">{user.bio}</p>
          )}

        </div>
      </div>

      {/* Actions */}
      <HeaderActions
        user={user}
        isOwner={isOwner}
        me={me}
        rel={rel}
        friendBusy={friendBusy}
        onAddFriend={onAddFriend}
        onAcceptFriend={onAcceptFriend}
        onRemoveFriend={onRemoveFriend}
        onReport={onReport}
      />
    </div>
  );
}

function HeaderActions({
  user,
  isOwner,
  me,
  rel,
  friendBusy,
  onAddFriend,
  onAcceptFriend,
  onRemoveFriend,
  onReport,
}: {
  user: ProfileUser;
  isOwner: boolean;
  me: AccountUser | null;
  rel: Relationship | null;
  friendBusy: boolean;
  onAddFriend: () => void;
  onAcceptFriend: () => void;
  onRemoveFriend: () => void;
  onReport: () => void;
}) {
  const router = useRouter();

  if (isOwner) {
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href="/profile/edit"
          className="btn-ghost inline-flex min-h-[44px] items-center px-4 font-display text-sm"
        >
          Edit profile
        </Link>
        <ShareButton username={user.username} />
      </div>
    );
  }

  // Signed out: no actions (Challenge needs an account).
  if (!me) return null;

  const signedInNonGuest = !me.isGuest;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(`/friend?challenge=${encodeURIComponent(user.username)}`)}
        className="btn-leaf inline-flex min-h-[44px] items-center gap-1.5 px-4 font-display text-sm font-semibold"
      >
        <Swords size={15} strokeWidth={2.3} aria-hidden />
        Challenge
      </button>

      {/* Friend button state machine (only for real accounts, not guests). */}
      {signedInNonGuest && rel === "none" && (
        <button
          type="button"
          onClick={onAddFriend}
          disabled={friendBusy}
          className="btn-ghost inline-flex min-h-[44px] items-center gap-1.5 px-4 font-display text-sm disabled:opacity-60"
        >
          <UserPlus size={15} strokeWidth={2.2} aria-hidden />
          Add friend
        </button>
      )}
      {signedInNonGuest && rel === "outgoing" && (
        <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-white/10 px-4 font-display text-sm text-parchment-400">
          <Check size={15} strokeWidth={2.2} aria-hidden />
          Request sent
        </span>
      )}
      {signedInNonGuest && rel === "incoming" && (
        <button
          type="button"
          onClick={onAcceptFriend}
          disabled={friendBusy}
          className="btn-leaf inline-flex min-h-[44px] items-center gap-1.5 px-4 font-display text-sm font-semibold disabled:opacity-60"
        >
          <Check size={15} strokeWidth={2.3} aria-hidden />
          Accept request
        </button>
      )}
      {signedInNonGuest && rel === "friends" && (
        <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-sm border border-verdigris-glow/40 bg-verdigris/10 px-4 font-display text-sm text-verdigris-glow">
          <UserCheck size={15} strokeWidth={2.2} aria-hidden />
          Friends
        </span>
      )}

      {signedInNonGuest && (
        <ShareButton username={user.username} />
      )}

      {/* Overflow: Message, Report, and Remove friend (when friends). */}
      {signedInNonGuest && (
        <OverflowMenu
          username={user.username}
          showRemove={rel === "friends"}
          friendBusy={friendBusy}
          onRemoveFriend={onRemoveFriend}
          onReport={onReport}
        />
      )}
    </div>
  );
}

// Share via the Web Share API, falling back to a clipboard copy with a transient
// "Link copied" confirmation.
function ShareButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url =
      typeof window !== "undefined"
        ? window.location.origin + `/u/${encodeURIComponent(username)}`
        : "";
    const title = `${username} on Nerf Chess`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled or unsupported: fall through to the clipboard copy.
      }
    }
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard access: nothing else we can do quietly.
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="btn-ghost inline-flex min-h-[44px] items-center gap-1.5 px-4 font-display text-sm"
    >
      <Share2 size={15} strokeWidth={2.2} aria-hidden />
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

// A keyboard-accessible overflow menu (Escape / click-outside close, focus
// returns to the trigger) holding Message, Report, and an optional Remove friend.
function OverflowMenu({
  username,
  showRemove,
  friendBusy,
  onRemoveFriend,
  onReport,
}: {
  username: string;
  showRemove: boolean;
  friendBusy: boolean;
  onRemoveFriend: () => void;
  onReport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${username}`}
        className="grid h-11 w-11 place-items-center rounded-sm border border-white/10 text-parchment-400 transition hover:border-white/25 hover:text-parchment-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-leaf"
      >
        <MoreHorizontal size={18} strokeWidth={2.2} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={`Actions for ${username}`}
          className="absolute right-0 top-full z-40 mt-1.5 w-48 plate dropdown p-1 shadow-2xl"
        >
          <Link
            role="menuitem"
            href={`/inbox/${encodeURIComponent(username)}`}
            className="flex min-h-[44px] items-center gap-2 rounded px-3 font-display text-[13px] text-parchment-200 transition hover:bg-white/[0.05]"
          >
            <MessageSquare size={15} strokeWidth={2.2} aria-hidden />
            Message
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onReport();
            }}
            className="flex min-h-[44px] w-full items-center gap-2 rounded px-3 text-left font-display text-[13px] text-parchment-200 transition hover:bg-oxblood/15 hover:text-oxblood-glow"
          >
            <Flag size={15} strokeWidth={2.2} aria-hidden />
            Report
          </button>
          {showRemove && (
            <button
              type="button"
              role="menuitem"
              disabled={friendBusy}
              onClick={() => {
                setOpen(false);
                onRemoveFriend();
              }}
              className="flex min-h-[44px] w-full items-center gap-2 rounded px-3 text-left font-display text-[13px] text-parchment-200 transition hover:bg-oxblood/15 hover:text-oxblood-glow disabled:opacity-50"
            >
              <UserX size={15} strokeWidth={2.2} aria-hidden />
              Remove friend
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Tabs -------------------------------------------------------------------

function TabButton({
  id,
  label,
  active,
  onSelect,
}: {
  id: string;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={onSelect}
      className={
        "relative -mb-px min-h-[44px] px-4 font-display text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-leaf " +
        (active
          ? "border-b-2 border-gold text-parchment-50"
          : "border-b-2 border-transparent text-parchment-400 hover:text-parchment-200")
      }
    >
      {label}
    </button>
  );
}

// ---- Games tab (spec 2.6) ---------------------------------------------------

type ModeFilter = "" | DraftMode;
type ResultFilter = "" | "win" | "loss" | "draw";
type RatedFilter = "" | "1" | "0";

function GamesTab({
  username,
  user,
  playingNow,
  active,
}: {
  username: string;
  user: ProfileUser;
  playingNow: boolean;
  active: boolean;
}) {
  const [mode, setMode] = useState<ModeFilter>("");
  const [result, setResult] = useState<ResultFilter>("");
  const [rated, setRated] = useState<RatedFilter>("");
  const [games, setGames] = useState<RecentGameRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  // Bumped by Retry so a failed load can be re-attempted without changing filters.
  const [reloadTick, setReloadTick] = useState(0);

  const query = (extra?: Record<string, string>) => {
    const qs = new URLSearchParams();
    if (mode) qs.set("mode", mode);
    if (result) qs.set("result", result);
    if (rated) qs.set("rated", rated);
    qs.set("limit", "30");
    for (const [k, v] of Object.entries(extra ?? {})) qs.set(k, v);
    return qs.toString();
  };

  useEffect(() => {
    // Lazy: fetch only while the Games tab is actually shown (and refetch on any
    // filter change, which can only happen while it is visible).
    if (!active) return;
    let cancelled = false;
    // Loading-then-fetch: the remaining setState calls all fire after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase("loading");
    fetch(`/api/users/${encodeURIComponent(username)}/games?${query()}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ games: RecentGameRow[]; hasMore: boolean }>) : Promise.reject()))
      .then((body) => {
        if (cancelled) return;
        setGames(body.games);
        setHasMore(body.hasMore);
        setPhase("ready");
      })
      .catch(() => {
        if (!cancelled) setPhase("error");
      });
    return () => {
      cancelled = true;
    };
    // query() reads mode/result/rated/username; re-run when any change (or on Retry).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, mode, result, rated, username, reloadTick]);

  const loadMore = async () => {
    const last = games[games.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/games?${query({ before: String(last.completed_at) })}`,
      );
      if (!res.ok) return;
      const body = (await res.json()) as { games: RecentGameRow[]; hasMore: boolean };
      setGames((g) => [...g, ...body.games]);
      setHasMore(body.hasMore);
    } catch {
      /* keep what we have; the button re-enables below */
    } finally {
      setLoadingMore(false);
    }
  };

  const decided = user.wins + user.losses + user.draws;

  return (
    <div>
      {/* Counts header */}
      <div className="plate flex flex-wrap items-center gap-x-5 gap-y-2 p-3">
        {playingNow && (
          <span className="inline-flex items-center gap-1.5 smallcaps text-[12px] text-oxblood-glow">
            <span aria-hidden className="dot-live h-2 w-2 rounded-full bg-oxblood-glow" />
            Playing now
          </span>
        )}
        <Count label="Total" value={user.games} />
        <Count label="Record" value={`${user.wins}W ${user.losses}L ${user.draws}D`} />
        {decided > 0 && (
          <Count label="Win rate" value={`${Math.round((user.wins / Math.max(1, user.wins + user.losses)) * 100)}%`} />
        )}
      </div>

      {/* Filters */}
      <div className="mt-3 flex flex-col gap-2">
        <ChipGroup
          aria-label="Filter by mode"
          value={mode}
          onChange={(v) => setMode(v as ModeFilter)}
          options={[
            { value: "", label: "All" },
            { value: "buff", label: "Buff" },
            { value: "nerf", label: "Nerf" },
          ]}
        />
        <ChipGroup
          aria-label="Filter by result"
          value={result}
          onChange={(v) => setResult(v as ResultFilter)}
          options={[
            { value: "", label: "All" },
            { value: "win", label: "Wins" },
            { value: "loss", label: "Losses" },
            { value: "draw", label: "Draws" },
          ]}
        />
        <ChipGroup
          aria-label="Filter by rated"
          value={rated}
          onChange={(v) => setRated(v as RatedFilter)}
          options={[
            { value: "", label: "All" },
            { value: "1", label: "Rated" },
            { value: "0", label: "Casual" },
          ]}
        />
      </div>

      {/* List */}
      <div className="mt-3">
        {phase === "loading" ? (
          <div className="plate p-3">
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded bg-white/[0.04] motion-reduce:animate-none"
                />
              ))}
            </div>
          </div>
        ) : phase === "error" ? (
          <div className="plate flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-sm text-parchment-300">Could not load games.</p>
            <button
              type="button"
              onClick={() => {
                setPhase("loading");
                setReloadTick((t) => t + 1);
              }}
              className="btn-ghost inline-flex min-h-[44px] items-center px-5 font-display text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        ) : games.length === 0 ? (
          <div className="plate p-6 text-center text-sm text-parchment-400">
            {mode || result || rated ? "No games match these filters." : "No games yet."}
          </div>
        ) : (
          <>
            <div className="plate overflow-hidden">
              {games.map((g) => (
                <GameHistoryRow key={g.id} game={g} viewer={username} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-ghost inline-flex min-h-[44px] items-center px-5 font-display text-sm disabled:opacity-60"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Count({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-mono text-sm tabular-nums text-parchment-100">{value}</span>
      <span className="smallcaps text-[12px] text-parchment-400">{label}</span>
    </span>
  );
}

function ChipGroup({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  "aria-label": string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value || "all"}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={
              "inline-flex min-h-[44px] items-center rounded-sm border px-3 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-leaf sm:min-h-0 sm:py-1.5 " +
              (on
                ? "border-gold/40 bg-gold/15 text-gold-leaf"
                : "border-white/10 text-parchment-400 hover:border-white/25 hover:text-parchment-200")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// One finished-game row for the Games tab. The whole row opens the replay via a
// stretched overlay Link that is a SIBLING of the inner opponent PlayerLink (the
// content is pointer-events-none so clicks fall through to the overlay, while
// PlayerLink re-enables pointer events for itself), so no anchors nest. Below
// 640px it stacks so nothing is truncated away.
function GameHistoryRow({ game, viewer }: { game: RecentGameRow; viewer: string }) {
  const viewerIsWhite = game.white_name.toLowerCase() === viewer.toLowerCase();
  const myColor: "w" | "b" = viewerIsWhite ? "w" : "b";
  const opponent = viewerIsWhite ? game.black_name : game.white_name;
  const oppRating = viewerIsWhite ? game.black_rating_before : game.white_rating_before;

  const outcome =
    game.winner === "draw" ? "Draw" : game.winner == null ? "Aborted" : game.winner === myColor ? "Won" : "Lost";
  const tone =
    outcome === "Won" ? "text-gold-leaf" : outcome === "Lost" ? "text-oxblood-glow" : "text-bruise-glow";

  const before = viewerIsWhite ? game.white_rating_before : game.black_rating_before;
  const after = viewerIsWhite ? game.white_rating_after : game.black_rating_after;
  const delta = before != null && after != null ? Math.round(after) - Math.round(before) : null;

  return (
    <div className="relative border-b border-white/5 last:border-b-0 transition hover:bg-white/[0.03]">
      <Link
        href={`/game/${game.id}`}
        aria-label={`View replay of the ${outcome.toLowerCase()} game vs ${opponent}`}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/60"
      />
      <div className="pointer-events-none relative z-10 flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-3">
        <span className={`shrink-0 font-display text-sm font-semibold sm:w-14 ${tone}`}>{outcome}</span>

        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="text-xs text-parchment-500">vs</span>
          <PlayerAvatar name={opponent} avatar={null} size={22} />
          <PlayerLink
            name={opponent}
            className="pointer-events-auto relative z-20 min-w-0 font-display text-sm text-parchment-100 hover:text-gold-leaf"
          />
          {oppRating != null && (
            <span className="shrink-0 font-mono text-xs tabular-nums text-parchment-400">
              ({Math.round(oppRating)})
            </span>
          )}
          {game.mode ? <ModeBadge mode={game.mode} /> : null}
        </span>

        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:justify-end">
          <span className="smallcaps text-[12px] text-parchment-400">{game.rated ? "Rated" : "Casual"}</span>
          <span className="font-mono text-parchment-400">{clockLabel(game.time_sec, game.increment_sec)}</span>
          {/* Rating change as its own bordered chip, with a " · " separator, so
              the delta can never run together with the date. Sign in text. */}
          {delta != null && (
            <span
              className={
                "inline-flex items-center rounded-sm border px-1.5 py-px font-mono text-[11px] tabular-nums " +
                (delta > 0
                  ? "border-gold/40 bg-gold/10 text-gold-leaf"
                  : delta < 0
                    ? "border-oxblood-glow/40 bg-oxblood/10 text-oxblood-glow"
                    : "border-white/15 bg-white/[0.03] text-parchment-400")
              }
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
          <span aria-hidden className="text-parchment-600">·</span>
          <span className="text-parchment-400">{game.reason}</span>
          <span aria-hidden className="text-parchment-600">·</span>
          <span className="text-parchment-400">{relativeTime(game.completed_at)}</span>
        </span>
      </div>
    </div>
  );
}

// ---- Activity: achievements + standings -------------------------------------

interface StripAchievement {
  id: string;
  name: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  unlockedAt: number | null;
}

const STRIP_ACCENT: Record<StripAchievement["rarity"], string> = {
  legendary: "#e0b256",
  epic: "#b78fd6",
  rare: "#4a9fee",
  common: "#7eb59a",
};

// A one-row trophy shelf: the player's most recent (rarest-first on ties)
// unlocks and their earned/total count, linking to the full wall.
function AchievementsStrip({ username }: { username: string }) {
  const [data, setData] = useState<{
    unlockedCount: number;
    total: number;
    recent: StripAchievement[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${encodeURIComponent(username)}/achievements`)
      .then((res) =>
        res.ok
          ? (res.json() as Promise<{
              unlockedCount: number;
              total: number;
              achievements: StripAchievement[];
            }>)
          : null,
      )
      .then((body) => {
        if (cancelled || !body) return;
        const rank = { legendary: 3, epic: 2, rare: 1, common: 0 } as const;
        const recent = body.achievements
          .filter((a) => a.unlocked)
          .sort(
            (x, y) => (y.unlockedAt ?? 0) - (x.unlockedAt ?? 0) || rank[y.rarity] - rank[x.rarity],
          )
          .slice(0, 6);
        setData({ unlockedCount: body.unlockedCount, total: body.total, recent });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [username]);

  return (
    <Link
      href={`/achievements?u=${encodeURIComponent(username)}`}
      className="mt-4 plate flex flex-wrap items-center justify-between gap-3 p-3 transition hover:border-gold/40"
    >
      <span className="flex items-center gap-2 font-display text-parchment-100">
        <Trophy className="h-4 w-4 text-sun-glow" strokeWidth={2} /> Achievements
        {data && (
          <span className="font-mono text-sm tabular-nums text-parchment-300">
            {data.unlockedCount}
            <span className="text-parchment-500">/{data.total}</span>
          </span>
        )}
      </span>
      <span className="flex items-center gap-2">
        {data?.recent.map((a) => {
          const Icon = achievementIcon(a.icon);
          const accent = STRIP_ACCENT[a.rarity];
          return (
            <span
              key={a.id}
              title={a.name}
              className="grid h-8 w-8 place-items-center rounded-md border"
              style={{ borderColor: `${accent}66`, background: `${accent}1a` }}
            >
              <Icon className="h-4 w-4" style={{ color: accent }} strokeWidth={2} />
            </span>
          );
        })}
        <span className="smallcaps text-[12px] text-gold-leaf">View all</span>
      </span>
    </Link>
  );
}

// The honors shelf: a carved trophy strip for every leaderboard the player
// currently places top 10 on. Each placement is a medallion — laurel, rank,
// board — scaled by rank: podium placements (top 3) read as gold slabs with a
// crown glyph and the gold rim, 4-10 as quieter brass. Everything derives
// from the live standings (useTopPlacements); nothing here is stored, so
// dropping out of the top 10 simply stops the medallion rendering.
function CurrentStandings({ placements }: { placements: LaurelPlacement[] }) {
  return (
    <section aria-label="Leaderboard honors" className="mt-2 plate dgn-rivets p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-display text-parchment-100">
          <LaurelBadge rank={placements[0].rank} size={16} title="Current top-10 honors" />
          Leaderboard honors
        </span>
        <Link
          href="/leaderboard"
          className="smallcaps text-[12px] text-gold-leaf transition-colors hover:text-sun-glow"
        >
          Leaderboard
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-stretch gap-2">
        {placements.map((p) => {
          const podium = p.rank <= 3;
          return (
            <Link
              key={p.category}
              href="/leaderboard"
              title={placementTitle(p)}
              className={
                "hover-lift flex items-center gap-2.5 border px-3 py-2 no-underline " +
                (podium
                  ? "podium-rim-gold border-transparent bg-sun/[0.07]"
                  : "bg-white/[0.03]")
              }
              style={
                podium
                  ? { boxShadow: "0 0 20px -8px rgb(var(--energy-gold-rgb) / 0.45)" }
                  : { borderColor: "rgba(224, 178, 86, 0.35)" } // brass, matching the 4-10 laurel
              }
            >
              <LaurelBadge rank={p.rank} size={podium ? 22 : 18} />
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5">
                  <span
                    className={
                      "font-mono text-sm tabular-nums " +
                      (podium ? "text-sun-glow" : "text-parchment-100")
                    }
                  >
                    #{p.rank}
                  </span>
                  <span className="text-[12px] text-parchment-400">· {p.label}</span>
                  {podium && <Crown size={12} className="shrink-0 text-sun-glow" aria-hidden />}
                </span>
                <span className="text-[12px] text-parchment-400">Current standing</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ---- Skeleton ---------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
      <div className="flex items-center gap-4">
        <div className="skeleton h-[72px] w-[72px] shrink-0 rounded-full" style={{ borderRadius: "50%" }} />
        <div className="min-w-0">
          <div className="skeleton h-9 w-48 max-w-full rounded-[10px]" style={{ borderRadius: 10 }} />
          <div className="skeleton mt-2 h-4 w-40 rounded-[10px]" style={{ borderRadius: 10 }} />
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="plate p-4">
            <div className="skeleton h-4 w-16 rounded-[10px]" style={{ borderRadius: 10 }} />
            <div className="skeleton mt-3 h-7 w-20 rounded-[10px]" style={{ borderRadius: 10 }} />
            <div className="skeleton mt-3 h-3 w-32 rounded-[10px]" style={{ borderRadius: 10 }} />
          </div>
        ))}
      </div>
      <div className="plate mt-4 p-4">
        <div className="skeleton h-24 w-full rounded-[10px]" style={{ borderRadius: 10 }} />
      </div>
      <div className="plate mt-8 p-5">
        <div className="skeleton h-5 w-28 rounded-[10px]" style={{ borderRadius: 10 }} />
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-9 rounded-[10px]" style={{ borderRadius: 10 }} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- House-bot editor (unchanged behavior) ----------------------------------

// Read-only bio helper reused by the house editor's editable variant. For a
// normal profile the bio renders read-only in the header; owners edit it at
// /profile/edit. The house editor still writes the bot's row inline.
function BioSection({
  bio,
  editable,
  onSaved,
  saveBio,
}: {
  bio: string | null;
  editable: boolean;
  onSaved: (bio: string | null) => void;
  saveBio?: (bio: string | null) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio ?? "");
  const [saving, setSaving] = useState(false);

  if (!bio && !editable) return null;

  const save = async () => {
    setSaving(true);
    try {
      let next: string | null;
      if (saveBio) {
        next = await saveBio(draft.trim() || null);
      } else {
        const res = await fetch("/api/auth/bio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bio: draft.trim() || null }),
        });
        if (!res.ok) {
          setSaving(false);
          return;
        }
        next = ((await res.json()) as { bio: string | null }).bio;
      }
      onSaved(next);
      setDraft(next ?? "");
      setEditing(false);
    } catch {
      // Leave the editor open so the text isn't lost.
    }
    setSaving(false);
  };

  return (
    <div className="mt-4">
      {editing ? (
        <div className="plate p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 300))}
            rows={3}
            placeholder="Say something about this account..."
            className="w-full resize-none bg-transparent text-sm text-parchment-100 outline-none"
            autoFocus
          />
          <div className="mt-2 flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="min-h-[44px] rounded-sm btn-ghost px-3 font-display text-gold-leaf"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-[44px] rounded-sm btn-ghost px-3"
            >
              Cancel
            </button>
            <span className="ml-auto text-xs text-parchment-400">{draft.length}/300</span>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-parchment-200">
          {bio}
          {editable && (
            <button
              type="button"
              onClick={() => {
                setDraft(bio ?? "");
                setEditing(true);
              }}
              className="ml-2 text-gold-leaf hover:underline"
            >
              {bio ? "Edit" : "Add a bio"}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

// Optimistic ratings map after a hand-set edit: overwrite every bucket the
// player already has to `rating`, and ensure both visible mode cards (Nerf,
// Buff) render it even if the player was previously Unrated there. Shared by the
// standalone rating editor (real players) and the House bot menu (bots), which
// both set every category to one number. rd 90 is non-provisional (< 110), so
// the display matches the server's settled value with no "?" flicker.
function ratingsWithAllSet(
  ratings: Record<string, CategoryRatingRow> | undefined,
  rating: number,
): Record<string, CategoryRatingRow> {
  const next: Record<string, CategoryRatingRow> = { ...(ratings ?? {}) };
  for (const key of Object.keys(next)) {
    next[key] = {
      ...next[key],
      rating,
      rd: Math.min(next[key].rd ?? 90, 90),
      peak: Math.max(next[key].peak ?? rating, rating),
    };
  }
  for (const c of MODE_RATING_CATEGORIES) {
    if (!next[c.id]) {
      next[c.id] = { rating, rd: 90, games: 0, wins: 0, losses: 0, draws: 0, peak: rating };
    }
  }
  return next;
}

// Inline rating editor, shown on ANY non-bot profile ONLY to the designated
// rating editor (ilovenewjeans). Types a number and sets every rating bucket for
// the account to it in one save (via /api/mod/ratings), so the value updates
// identically across the profile cards, the header chip, the leaderboard, the
// lobby, and player search. The server re-verifies the ilovenewjeans gate; this
// control is a UX affordance only. (For house bots the same control is folded
// into the House bot menu — see HouseBotEditor.)
function RatingEditor({
  username,
  current,
  onApplied,
}: {
  username: string;
  current: number | null;
  onApplied: (username: string, rating: number) => void;
}) {
  const [value, setValue] = useState(current != null ? String(Math.round(current)) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Navigating profile->profile unmounts this editor (the parent falls back to
  // the skeleton while the next profile loads). An in-flight save must not touch
  // state or call back after that, or a slow save started on player A could land
  // on player B's now-mounted profile. Flipped false on unmount.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const save = async () => {
    // Re-entrancy guard: the Save button is disabled while saving, but Enter in
    // the input is not — without this a double-press fires duplicate POSTs.
    if (saving) return;
    const trimmed = value.trim();
    if (trimmed === "") return;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setError("Enter a number.");
      return;
    }
    const rating = Math.round(parsed);
    setSaving(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/mod/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, rating }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; rating?: number } | null;
      if (!alive.current) return;
      setSaving(false);
      if (!res.ok) {
        setError(data?.error ?? "Could not save. Try again.");
        return;
      }
      const applied = data?.rating ?? rating;
      setValue(String(applied));
      setNote(`All ratings set to ${applied}.`);
      // Pass the username this save targeted so the parent can ignore a stale
      // callback that resolved after the viewer moved to a different profile.
      onApplied(username, applied);
    } catch {
      if (!alive.current) return;
      setSaving(false);
      setError("Could not save. Try again.");
    }
  };

  return (
    <div className="mt-5 plate border border-gold/25 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="smallcaps rounded-full border border-gold/40 px-2 py-0.5 text-[12px] text-gold-leaf">
          Rating editor
        </span>
        <span className="text-xs text-parchment-400">
          Set this player&rsquo;s rating in every category at once.
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="rating-edit" className="w-16 text-xs text-parchment-400">
          Rating
        </label>
        <input
          id="rating-edit"
          type="number"
          inputMode="numeric"
          min={0}
          max={4000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
          }}
          className="w-28 bg-transparent plate px-3 py-1.5 text-sm font-mono tabular-nums outline-none focus:border-gold/40"
        />
        <button
          type="button"
          disabled={saving || value.trim() === ""}
          onClick={() => void save()}
          className="min-h-[44px] rounded-sm btn-ghost px-3 text-gold-leaf disabled:opacity-40"
        >
          {saving ? "Saving..." : "Set all ratings"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-oxblood-glow">{error}</p>}
      {note && !error && <p className="mt-2 text-xs text-verdigris-glow">{note}</p>}
    </div>
  );
}

// Inline editor for a house-bot account, shown on its profile ONLY to the
// designated house editor (ilovenewjeans). Renames it, swaps its picture, sets
// its bio, or sets its rating through the house-persona route. The rating field
// is the bot-side of the player rating editor, folded in here (bots are edited
// through this one menu); it persists as an override the engine resync respects.
function HouseBotEditor({
  userId,
  avatars,
  username,
  avatar,
  bio,
  rating,
  onIdentity,
  onBio,
  onRating,
}: {
  userId: string;
  avatars: string[];
  username: string;
  avatar: string | null;
  bio: string | null;
  rating: number | null;
  onIdentity: (username: string, avatar: string | null) => void;
  onBio: (bio: string | null) => void;
  onRating: (rating: number) => void;
}) {
  const [name, setName] = useState(username);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // The rating field, seeded from the bot's current effective rating.
  const [ratingValue, setRatingValue] = useState(rating != null ? String(Math.round(rating)) : "");
  // Custom-upload flow: `preparing` covers the client-side decode/downscale;
  // `preview` holds the compressed square data URL awaiting confirmation, so the
  // editor can show it before committing (preview-before-save). The hidden file
  // input is driven by the "Upload image…" button (desktop click / mobile tap;
  // `accept` also lets a phone offer its camera).
  const [preparing, setPreparing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const post = async (body: Record<string, unknown>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/mod/house/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setSaving(false);
      if (!res.ok) {
        setError(data?.error ?? "Could not save. Try again.");
        return false;
      }
      return true;
    } catch {
      setSaving(false);
      setError("Could not save. Try again.");
      return false;
    }
  };

  const dirty = name.trim() !== username;
  const ratingDirty = ratingValue.trim() !== (rating != null ? String(Math.round(rating)) : "");

  const saveName = async () => {
    const next = name.trim();
    if (next === username) return;
    if (await post({ username: next })) {
      setNote("Saved");
      onIdentity(next, avatar);
    }
  };

  // Set the bot's rating across every category. Persisted as a house override so
  // the engine resync never reverts it (unlike a plain user rating edit, which
  // is why this lives in the house menu rather than the standalone editor).
  const saveRating = async () => {
    if (saving) return;
    const trimmed = ratingValue.trim();
    if (trimmed === "") return;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setError("Enter a number.");
      return;
    }
    const next = Math.round(parsed);
    if (await post({ rating: next })) {
      setRatingValue(String(next));
      setNote(`Rating set to ${next}.`);
      onRating(next);
    }
  };

  const pickAvatar = async (id: string) => {
    if (await post({ avatar: id })) {
      setNote("Saved");
      setPicking(false);
      onIdentity(username, id);
    }
  };

  // Read a chosen file, then downscale + center-crop it to a compact square data
  // URL on the client (256px, matching the site's round avatar shape) and hold
  // it as a preview. Nothing is persisted until the editor confirms below. The
  // server re-validates MIME / byte-size / pixel-dimensions on save
  // (validateImageDataUrl in the personas route), so these client-side checks
  // are convenience only and never trusted for authorization or acceptance.
  const onFile = async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
    setNote(null);
    setPreparing(true);
    try {
      const dataUrl = await fileToDataUrl(file, { maxDim: 256, maxChars: 200_000, cover: true });
      setPreview(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that image.");
    } finally {
      setPreparing(false);
      // Clear the input so re-selecting the same file still fires onChange.
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Commit the previewed upload as this bot's avatar (persisted immediately and
  // reflected everywhere the bot appears via onIdentity).
  const confirmUpload = async () => {
    if (!preview || saving) return;
    const dataUrl = preview;
    if (await post({ avatar: dataUrl })) {
      setNote("Saved");
      setPreview(null);
      setPicking(false);
      onIdentity(username, dataUrl);
    }
  };

  const saveBio = async (nextBio: string | null): Promise<string | null> => {
    const res = await fetch("/api/mod/house/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, bio: nextBio }),
    });
    if (!res.ok) throw new Error("save failed");
    const data = (await res.json()) as {
      personas?: { userId: string; effective: { bio: string | null } }[];
    };
    return data.personas?.find((p) => p.userId === userId)?.effective.bio ?? null;
  };

  return (
    <div className="mt-5 plate border border-gold/25 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="smallcaps rounded-full border border-gold/40 px-2 py-0.5 text-[12px] text-gold-leaf">
          House bot
        </span>
        <span className="text-xs text-parchment-400">
          You can edit this account&rsquo;s name, picture, bio, and rating.
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="house-name" className="w-16 text-xs text-parchment-400">
          Username
        </label>
        <input
          id="house-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && dirty) saveName();
          }}
          maxLength={20}
          className="w-48 bg-transparent plate px-3 py-1.5 text-sm font-display font-semibold outline-none focus:border-gold/40"
        />
        <button
          type="button"
          disabled={saving || !dirty}
          onClick={saveName}
          className="min-h-[44px] rounded-sm btn-ghost px-3 text-gold-leaf disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="house-rating" className="w-16 text-xs text-parchment-400">
          Rating
        </label>
        <input
          id="house-rating"
          type="number"
          inputMode="numeric"
          min={0}
          max={4000}
          value={ratingValue}
          onChange={(e) => setRatingValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && ratingDirty) void saveRating();
          }}
          className="w-28 bg-transparent plate px-3 py-1.5 text-sm font-mono tabular-nums outline-none focus:border-gold/40"
        />
        <button
          type="button"
          disabled={saving || ratingValue.trim() === "" || !ratingDirty}
          onClick={() => void saveRating()}
          className="min-h-[44px] rounded-sm btn-ghost px-3 text-gold-leaf disabled:opacity-40"
        >
          {saving ? "Saving..." : "Set rating"}
        </button>
        <span className="text-[11px] text-parchment-500">Both modes, engine-safe.</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="w-16 text-xs text-parchment-400">Picture</span>
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          title="Change picture"
          className="press shrink-0"
        >
          <PlayerAvatar name={username} avatar={avatar} size={40} />
        </button>
        <span className="text-xs text-parchment-400">
          {picking ? "Upload or pick one below" : "Click to change"}
        </span>
      </div>
      {picking && (
        <div className="mt-3">
          {/* Custom upload (from device/camera). Hidden input driven by the
              button so the control matches the site's styling on desktop and
              mobile alike. */}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {preview ? (
            // Preview-before-save: show the cropped square exactly as it will
            // render, then confirm or discard.
            <div className="flex flex-wrap items-center gap-3">
              <PlayerAvatar name={username} avatar={preview} size={56} />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={confirmUpload}
                  className="min-h-[44px] rounded-sm btn-ghost px-3 text-gold-leaf disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Use this picture"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => fileRef.current?.click()}
                  className="min-h-[44px] rounded-sm btn-ghost px-3 disabled:opacity-40"
                >
                  Choose another
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setPreview(null)}
                  className="min-h-[44px] rounded-sm btn-ghost px-3 disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={saving || preparing}
                onClick={() => fileRef.current?.click()}
                className="min-h-[44px] rounded-sm btn-ghost px-3 text-gold-leaf disabled:opacity-40"
              >
                {preparing ? "Preparing..." : "Upload image..."}
              </button>
              <span className="text-[11px] text-parchment-500">
                PNG, JPEG, WebP, or GIF. Cropped to a square; max 1 MB after compression.
              </span>
            </div>
          )}
          {!preview && (
            <div className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
              {avatars.map((id) => (
                <button
                  key={id}
                  type="button"
                  disabled={saving}
                  onClick={() => pickAvatar(id)}
                  title={id}
                  className={
                    "press rounded-md border p-0.5 transition " +
                    (id === avatar ? "border-gold/60" : "border-transparent hover:border-white/25")
                  }
                >
                  <PlayerAvatar name={username} avatar={id} size={28} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <BioSection bio={bio} editable onSaved={onBio} saveBio={saveBio} />

      {error && <p className="mt-2 text-xs text-oxblood-glow">{error}</p>}
      {note && !error && <p className="mt-2 text-xs text-verdigris-glow">{note}</p>}
    </div>
  );
}

// ---- Report modal (unchanged) -----------------------------------------------

const REPORT_REASONS = [
  ["cheating", "Cheating / outside assistance"],
  ["boosting", "Rating manipulation"],
  ["chat", "Offensive chat"],
  ["username", "Inappropriate username"],
  ["other", "Something else"],
] as const;

function ReportModal({ username, onClose }: { username: string; onClose: () => void }) {
  const [reason, setReason] = useState<string>("cheating");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async () => {
    setStatus("sending");
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, reason, description }),
    });
    if (res.ok) {
      setStatus("sent");
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not send the report.");
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="plate w-full max-w-md max-h-[90dvh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "sent" ? (
          <>
            <h2 className="font-display text-2xl">Report sent</h2>
            <p className="mt-2 text-sm text-parchment-200">Thanks, a moderator will take a look.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 min-h-[44px] rounded-sm btn-ghost px-4 font-display text-sm"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl">
              Report <span className="text-gold-leaf">{username}</span>
            </h2>
            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-parchment-100"
                >
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reason === value}
                    onChange={() => setReason(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder="What happened? Include game links or examples."
              className="mt-4 w-full plate resize-none bg-transparent p-3 text-sm text-parchment-100 outline-none focus:border-gold/40"
            />
            {status === "error" && <p className="mt-2 text-sm text-oxblood-glow">{error}</p>}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={status === "sending" || !description.trim()}
                className="min-h-[44px] rounded-sm btn-ghost px-4 font-display text-sm text-oxblood-glow disabled:opacity-50"
              >
                {status === "sending" ? "Sending..." : "Send report"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-sm btn-ghost px-4 font-display text-sm"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
