import { NextResponse } from "next/server";
import { guardJsonWrite } from "@/lib/server/request";
import { getDb, requestIsSecure } from "@/lib/server/db";
import {
  createSession,
  hashPassword,
  loginThrottled,
  recordLoginFailure,
  sessionCookie,
  sessionTokenFromCookieHeader,
  userForSession,
  usernameChangeStatements,
  validEmail,
  validPassword,
  validUsername,
} from "@/lib/server/auth";
import { RD_START, VOL_START } from "@/lib/glicko";
import { containsProfanity } from "@/lib/profanity";
import { verifyTurnstile } from "@/lib/server/turnstile";
import { whoCookieHeader } from "@/lib/session/who";
import { hintFromRow } from "../_lib/who";
import { isReservedUsername } from "../_lib/reserved";

export const dynamic = "force-dynamic";

/** New accounts per client IP per 15-minute window (the login_attempts window). */
const REGISTER_MAX_PER_IP = 10;

export async function POST(request: Request) {
  // Refuses cross-site browser requests (F046, login CSRF) and anything but
  // a JSON object body under 16 KB (F047: `null` used to crash the field
  // reads below with a 500). Shared with slice F: src/lib/server/request.ts.
  const parsed = await guardJsonWrite(request);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed as { username?: unknown; password?: unknown; email?: unknown; turnstileToken?: unknown };
  // Bot check: no-op unless TURNSTILE_SECRET_KEY is configured.
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  const humanOk = await verifyTurnstile(turnstileToken, request.headers.get("CF-Connecting-IP"));
  if (!humanOk) {
    return NextResponse.json({ error: "Captcha verification failed. Please try again." }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  // Optional sign-in email, stored lowercase.
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
  if (!validUsername(username)) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters: letters, digits, underscores." },
      { status: 400 },
    );
  }
  if (isReservedUsername(username)) {
    return NextResponse.json({ error: "That username is reserved." }, { status: 400 });
  }
  if (email && !validEmail(email)) {
    return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  }
  if (containsProfanity(username)) {
    return NextResponse.json({ error: "Please pick a different username." }, { status: 400 });
  }
  if (!validPassword(password)) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const db = await getDb();
  const caller = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));

  // Account creation per client IP, on the same rolling-window counter the
  // sign-in and guest guards use (F062). Turnstile is fail-open when its
  // secret is unset, so without this nothing capped scripted sign-ups.
  // A guest upgrading in place creates no row and is not counted.
  const ip = request.headers.get("CF-Connecting-IP");
  const ipKey = ip && !caller?.is_guest ? `register:${ip}` : null;
  if (ipKey && (await loginThrottled(db, ipKey, REGISTER_MAX_PER_IP))) {
    return NextResponse.json(
      { error: "Too many accounts created from this network. Try again later." },
      { status: 429 },
    );
  }

  const existing = await db
    .prepare("SELECT id FROM users WHERE username_lower = ?")
    .bind(username.toLowerCase())
    .first<{ id: string }>();
  if (existing && existing.id !== caller?.id) {
    return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  }
  if (email) {
    const emailOwner = await db
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first<{ id: string }>();
    if (emailOwner && emailOwner.id !== caller?.id) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }
  }

  // A signed-in guest registering upgrades their account in place, keeping
  // their rating, games, and member-since date.
  // Both writes below can still hit the UNIQUE indexes (username_lower /
  // email) despite the checks above: a concurrent registration can win the
  // race between check and write, and a signed-in non-guest re-posting their
  // own current username passes the check but violates the index on INSERT.
  // Map the constraint error to a 409 instead of letting it 500.
  // Anything else is a real failure: logged, and a 500 rather than a
  // misleading "already in use" (F062).
  const conflict = (err: unknown) => {
    if (err instanceof Error && /UNIQUE/i.test(err.message)) {
      return NextResponse.json({ error: "That username or email is already in use." }, { status: 409 });
    }
    console.error("register: write failed", err);
    return NextResponse.json({ error: "Could not create the account right now." }, { status: 500 });
  };
  if (caller?.is_guest) {
    try {
      // One batch with the username history (F076): links to the guest's old
      // /u/<GuestName> page keep resolving to the upgraded account, the same
      // as after a rename, and the history row cannot exist without the rename.
      await db.batch([
        db
          .prepare(
            "UPDATE users SET username = ?, username_lower = ?, password_hash = ?, email = COALESCE(?, email), is_guest = 0 WHERE id = ?",
          )
          .bind(username, username.toLowerCase(), await hashPassword(password), email, caller.id),
        ...usernameChangeStatements(db, caller.id, caller.username.toLowerCase(), username.toLowerCase()),
      ]);
    } catch (err) {
      return conflict(err);
    }
    // Same session, new name and no longer a guest: re-stamp the display
    // cookie so the next page draws the registered header at once.
    const upgraded = NextResponse.json({ id: caller.id, username });
    upgraded.headers.append(
      "Set-Cookie",
      whoCookieHeader(hintFromRow({ ...caller, username, is_guest: 0 }), requestIsSecure(request)),
    );
    return upgraded;
  }

  const id = crypto.randomUUID();
  try {
    await db
      .prepare(
        // rd/vol written explicitly (not via column DEFAULT): databases created
        // before the lichess-parity Glicko params still carry the old 350/0.06
        // defaults, and a new account must start wide (RD_START) so its first
        // games can swing hundreds of points. See src/lib/glicko.ts.
        "INSERT INTO users (id, username, username_lower, password_hash, email, created_at, rd, vol) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id, username, username.toLowerCase(), await hashPassword(password), email, Date.now(), RD_START, VOL_START)
      .run();
  } catch (err) {
    return conflict(err);
  }

  if (ipKey) await recordLoginFailure(db, ipKey); // counts one creation in the window
  const token = await createSession(db, id);
  const secure = requestIsSecure(request);
  const response = NextResponse.json({ id, username });
  response.headers.append("Set-Cookie", sessionCookie(token, secure));
  response.headers.append(
    "Set-Cookie",
    whoCookieHeader(hintFromRow({ username, avatar: null, role: "user", is_guest: 0 }), secure),
  );
  return response;
}
