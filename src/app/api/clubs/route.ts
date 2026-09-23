import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { isValidClubIcon } from "@/lib/clubIcons";
import { censorText, findProfanity } from "@/lib/profanity";
import { cleanText, codePointLength, TEXT_POLICIES } from "@/lib/textInput";
import { mutedRefusal } from "@/lib/server/social";
import { apiError, guardJsonWrite, PRIVATE_NO_STORE, rateLimit, tooManyRequests } from "@/lib/server/request";
import { CLUB_ICON_MAX_CHARS, CLUB_ICON_BODY_BYTES } from "./limits";

export const dynamic = "force-dynamic";

// Club creation is capped per owner (F061): a few new clubs a day, and a
// ceiling on clubs one account owns at once.
const CREATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const CREATE_WINDOW_MAX = 3;
const MAX_OWNED_CLUBS = 10;

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "club"
  );
}

async function uniqueSlug(db: D1Database, name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let i = 0; i < 20; i++) {
    const existing = await db.prepare("SELECT id FROM clubs WHERE slug = ?").bind(slug).first<{ id: string }>();
    if (!existing) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

type ClubListRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  owner_name: string;
  created_at: number;
  members: number;
  joined: number;
};

const LIST_COLUMNS = `c.id, c.slug, c.name, c.description, c.icon, c.owner_name, c.created_at,
              COUNT(cm.user_id) AS members,
              MAX(CASE WHEN cm.user_id = ? THEN 1 ELSE 0 END) AS joined`;

// The directory: the 50 biggest clubs, plus every club the viewer belongs to
// (F038: "Your clubs" used to miss any joined club outside the top 50).
// Optional ?q= narrows the directory to names containing the text, searched
// in the database rather than over the 50 rows the page already has.
export async function GET(request: Request) {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  const viewerId = user?.id ?? "";
  const q = cleanText(new URL(request.url).searchParams.get("q"), { maxChars: 60 }).toLowerCase();
  const nameFilter = q ? `WHERE lower(c.name) LIKE ? ESCAPE '\\'` : "";
  const binds: unknown[] = [viewerId];
  if (q) binds.push(`%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`);

  const [top, mine] = await Promise.all([
    db
      .prepare(
        `SELECT ${LIST_COLUMNS}
         FROM clubs c
         LEFT JOIN club_members cm ON cm.club_id = c.id
         ${nameFilter}
         GROUP BY c.id
         ORDER BY members DESC, c.created_at DESC
         LIMIT 50`,
      )
      .bind(...binds)
      .all<ClubListRow>(),
    viewerId && !q
      ? db
          .prepare(
            `SELECT ${LIST_COLUMNS}
             FROM clubs c
             LEFT JOIN club_members cm ON cm.club_id = c.id
             WHERE c.id IN (SELECT club_id FROM club_members WHERE user_id = ?)
             GROUP BY c.id
             ORDER BY members DESC, c.created_at DESC
             LIMIT 200`,
          )
          .bind(viewerId, viewerId)
          .all<ClubListRow>()
      : Promise.resolve({ results: [] as ClubListRow[] }),
  ]);
  const seen = new Set(top.results.map((c) => c.id));
  const clubs = [...top.results, ...mine.results.filter((c) => !seen.has(c.id))];
  // `joined` is per viewer, so the list is never shared from a cache.
  return NextResponse.json({ clubs }, { headers: { "Cache-Control": PRIVATE_NO_STORE } });
}

export async function POST(request: Request) {
  const body = await guardJsonWrite(request, { maxBytes: CLUB_ICON_BODY_BYTES });
  if (body instanceof NextResponse) return body;
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return apiError(401, "Sign in to create a club.");
  const muted = mutedRefusal(user, "create clubs");
  if (muted) return muted;

  // Names are identity: invisible characters, bidi overrides and profanity
  // are refused outright. Descriptions are running text: censored in place.
  const name = cleanText(body.name, TEXT_POLICIES.clubName);
  const description = censorText(cleanText(body.description, TEXT_POLICIES.clubDescription));
  if (codePointLength(name) < 3) return apiError(400, "Club name must be at least 3 characters.");
  if (findProfanity(name).length > 0) return apiError(400, "Pick a different club name.");
  if (typeof body.icon === "string" && body.icon.length > CLUB_ICON_MAX_CHARS) {
    return apiError(413, "That image is too large. Try a smaller picture.");
  }
  const icon = isValidClubIcon(body.icon) ? body.icon : "";

  const owned = await db
    .prepare("SELECT COUNT(*) AS n FROM clubs WHERE owner_user_id = ?")
    .bind(user.id)
    .first<{ n: number }>();
  if ((owned?.n ?? 0) >= MAX_OWNED_CLUBS) {
    return apiError(429, `You already own ${MAX_OWNED_CLUBS} clubs.`);
  }
  const limit = await rateLimit(db, `club:create:${user.id}`, CREATE_WINDOW_MAX, CREATE_WINDOW_MS);
  if (!limit.ok) return tooManyRequests("You have created a lot of clubs today. Try again tomorrow.", limit.retryAfterSec);

  const id = crypto.randomUUID();
  const slug = await uniqueSlug(db, name);
  const now = Date.now();
  await db.batch([
    db
      .prepare(
        `INSERT INTO clubs (id, slug, name, description, icon, owner_user_id, owner_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, slug, name, description, icon, user.id, user.username, now),
    db
      .prepare("INSERT INTO club_members (club_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)")
      .bind(id, user.id, now),
  ]);

  return NextResponse.json({
    club: { id, slug, name, description, icon, owner_name: user.username, created_at: now, members: 1 },
  });
}
