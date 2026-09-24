"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { login, register } from "@/lib/authClient";
import { safeNextPath } from "@/lib/safeNext";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, LinkButton } from "@/components/ui/Button";
import { useSession } from "@/lib/session/SessionProvider";

// Public sitekey; when unset the widget is skipped and signup works as before.
const TURNSTILE_SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

// The sign-in and registration form. The query string is read by the server
// page (./page.tsx) and arrives as props, so the route no longer suspends on
// useSearchParams and paints its header and form on a hard load instead of an
// empty body (F019).
export function LoginForm({
  next: nextParam,
  upgrading,
  oauthError,
}: {
  /** Where to go after signing in, already checked by safeNextPath. */
  next: string;
  /** Guests arriving to upgrade land on the register tab; their guest
   *  account is converted in place, keeping their rating and history. */
  upgrading: boolean;
  /** A Google sign-in failure, already limited to the known messages. */
  oauthError: string | null;
}) {
  const router = useRouter();
  // Checked again here: the push below must never leave the site whatever
  // the caller passed (F041).
  const next = safeNextPath(nextParam);
  // Read once, from the nc_who hint the first paint already has, so the
  // notice below is in the server HTML. A session without the hint (older
  // than the cookie) skips the notice on this load rather than inserting it
  // above the form when /me answers; /me sets the hint for the next one.
  const { display } = useSession();
  const [signedInAs] = useState(() => (display && !display.isGuest ? display.username : null));
  const [tab, setTab] = useState<"login" | "register">(upgrading ? "register" : "login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Google sign-in failures arrive back here as a query param.
  const [error, setError] = useState<string | null>(oauthError);

  // Turnstile: only rendered on the register tab when a sitekey is configured.
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // The api.js script may already be present after a client navigation.
  useEffect(() => {
    if (window.turnstile) queueMicrotask(() => setTurnstileReady(true));
  }, []);

  // Render (and clean up) the widget whenever the register tab is active.
  useEffect(() => {
    if (tab !== "register" || !TURNSTILE_SITEKEY || !turnstileReady) return;
    const el = turnstileRef.current;
    const turnstile = window.turnstile;
    if (!el || !turnstile) return;
    const id = turnstile.render(el, {
      sitekey: TURNSTILE_SITEKEY,
      action: "turnstile-spin-v1",
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    widgetIdRef.current = id;
    return () => {
      try {
        turnstile.remove(id);
      } catch {
        /* widget already gone */
      }
      widgetIdRef.current = null;
      setTurnstileToken("");
    };
  }, [tab, turnstileReady]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (tab === "register" && TURNSTILE_SITEKEY && !turnstileToken) {
      setError("Please complete the captcha.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (tab === "login") await login(username, password);
      else await register(username, password, email.trim(), turnstileToken);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
      // Tokens are single-use; reset so the user can retry.
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          /* nothing to reset */
        }
        setTurnstileToken("");
      }
    }
  };

  return (
    <main className="min-h-screen">
      {TURNSTILE_SITEKEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={() => setTurnstileReady(true)}
        />
      )}
      {/* The standard site nav (design system §9: identical on every page),
          not a logo-only stub. */}
      <SiteHeader />
      <section className="max-w-md mx-auto px-6 py-8">
        <h1 className="page-title">
          {tab === "login" ? "Welcome back" : "Create your account"}
        </h1>
        {upgrading && (
          <p className="mt-2 text-parchment-200 text-sm">
            Your guest rating, games, and member date carry over.
          </p>
        )}
        {signedInAs && (
          // A sign-in or a registration from here replaces the current
          // session, so say whose it is first (wave 2 account 11).
          <div className="mt-4 plate flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-[13px] text-parchment-300">
              You are signed in as <span className="font-semibold text-parchment-100">{signedInAs}</span>.
              Signing in below switches accounts.
            </p>
            <LinkButton tone="ghost"
              href={next}
              className="shrink-0 px-4 py-2 text-[13px]">
              Continue as {signedInAs}
            </LinkButton>
          </div>
        )}

        <div
          role="tablist"
          aria-label="Sign in or register"
          className="mt-6 grid grid-cols-2 gap-1 plate p-1"
          onKeyDown={(e) => {
            // The tabs pattern (F145): arrows, Home and End move between the
            // two tabs and select them; Tab leaves the list for the form.
            const order = ["login", "register"] as const;
            let to: (typeof order)[number] | null = null;
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") to = tab === "login" ? "register" : "login";
            else if (e.key === "Home") to = "login";
            else if (e.key === "End") to = "register";
            if (!to) return;
            e.preventDefault();
            setTab(to);
            setError(null);
            document.getElementById(`login-tab-${to}`)?.focus();
          }}
        >
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              type="button"
              id={`login-tab-${t}`}
              role="tab"
              aria-selected={tab === t}
              aria-controls="login-panel"
              tabIndex={tab === t ? 0 : -1}
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              // These are tabs, not a bespoke control, and they measured 32px
              // tall: the smallest targets on the one page every new player
              // has to get through. A min-height rather than more padding, so
              // the pair keeps its current density on a mouse.
              className={
                "flex min-h-[44px] items-center justify-center py-2 text-sm font-display font-semibold tracking-wide transition " +
                (tab === t ? "bg-[color:var(--bg-raised)] text-gold-leaf" : "text-parchment-300 hover:bg-[color:var(--bg-raised)]")
              }
            >
              {t === "login" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        {/* Persistent alert slot (F144): announced when the error text
            changes, without adding a box to the form's spacing. */}
        <div role="alert" className="sr-only">
          {error ?? ""}
        </div>
        <form
          onSubmit={submit}
          id="login-panel"
          role="tabpanel"
          aria-labelledby={`login-tab-${tab}`}
          className="mt-4 plate p-6 space-y-4"
        >
          {error && (
            <div className="p-3 border border-oxblood-glow/60 bg-oxblood/15 text-parchment text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="text-[12px] font-medium text-parchment-300 block mb-1.5" htmlFor="username">
              {tab === "login" ? "Username or email" : "Username"}
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              maxLength={tab === "login" ? 254 : 20}
              aria-describedby={tab === "register" ? "username-help" : undefined}
              className="w-full bg-[color:var(--bg-base)] border border-[color:var(--edge)] px-4 py-3 focus:border-[color:var(--edge-strong)] text-parchment placeholder:text-parchment-500"
              placeholder="knight_rider"
            />
            {tab === "register" && (
              <p id="username-help" className="mt-1 text-[12px] text-parchment-400">
                3-20 characters: letters, digits, underscores.
              </p>
            )}
          </div>
          {tab === "register" && (
            <div>
              <label className="text-[12px] font-medium text-parchment-300 block mb-1.5" htmlFor="email">
                Email <span className="normal-case text-parchment-500">(optional)</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                maxLength={254}
                className="w-full bg-[color:var(--bg-base)] border border-[color:var(--edge)] px-4 py-3 focus:border-[color:var(--edge-strong)] text-parchment placeholder:text-parchment-500"
                placeholder="you@example.com"
              />
              <p className="mt-1 text-[12px] text-parchment-400">
                Sign in with your email.
              </p>
            </div>
          )}
          <div>
            <label className="text-[12px] font-medium text-parchment-300 block mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              // The rule is a persistent help line tied to the field, not a
              // placeholder that goes away on the first keystroke; minLength
              // stops a short password before the round trip.
              minLength={tab === "register" ? 8 : undefined}
              aria-describedby={tab === "register" ? "password-help" : undefined}
              className="w-full bg-[color:var(--bg-base)] border border-[color:var(--edge)] px-4 py-3 focus:border-[color:var(--edge-strong)] text-parchment"
            />
            {tab === "register" && (
              <p id="password-help" className="mt-1 text-[12px] text-parchment-400">
                At least 8 characters.
              </p>
            )}
          </div>
          {tab === "register" && TURNSTILE_SITEKEY && (
            // Reserves the widget's box while api.js loads (F016): the
            // standard Turnstile widget renders 65px tall, and the form below
            // used to jump by that much when it arrived.
            <div ref={turnstileRef} className="flex min-h-[65px] justify-center" />
          )}
          <Button tone="leaf"
            type="submit"
            disabled={
              busy ||
              !username.trim() ||
              !password ||
              (tab === "register" && !!TURNSTILE_SITEKEY && !turnstileToken)
            }
            className="w-full py-3 text-lg disabled:opacity-50">
            {busy ? "One moment…" : tab === "login" ? "Sign in" : "Create account"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--bg-raised)]" />
            <span className="text-[12px] text-parchment-400">or</span>
            <div className="h-px flex-1 bg-[color:var(--bg-raised)]" />
          </div>
          <a
            href={`/api/auth/google?next=${encodeURIComponent(next)}`}
            className="w-full flex items-center justify-center gap-3 py-3 border border-[color:var(--edge)] bg-[color:var(--bg-base)] hover:bg-[color:var(--bg-raised)] transition text-parchment font-display text-[15px]"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.6l6.86-6.86C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.2C12.44 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.2C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </a>
        </form>
      </section>
    </main>
  );
}
